import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from '../src/catalog/catalog.service';
import type { CatalogQuery } from '../src/catalog/catalog.types';
import { FitmentService } from '../src/catalog/fitment/fitment.service';
import { ProductDetailService } from '../src/catalog/product-detail/product-detail.service';
import type { ProductDetailQuery } from '../src/catalog/product-detail/product-detail.types';
import { VehicleContextService } from '../src/catalog/vehicle-context/vehicle-context.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanProductDetailFixtures,
  createProductDetailFixtures,
  PDP,
} from './product-detail.fixtures';

const EMPTY_DETAIL_QUERY: ProductDetailQuery = {
  year: null,
  generationId: null,
  engineTypeId: null,
  savedVehicleId: null,
};
const BASE_CATALOG_QUERY: CatalogQuery = {
  q: null,
  categoryId: null,
  brandId: null,
  minPrice: null,
  maxPrice: null,
  currency: null,
  inStock: null,
  condition: null,
  ...EMPTY_DETAIL_QUERY,
  page: 1,
  pageSize: 20,
  sort: 'name_asc',
};

describe('ProductDetailService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let productDetail: ProductDetailService;
  let catalog: CatalogService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        CatalogService,
        FitmentService,
        ProductDetailService,
        VehicleContextService,
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    productDetail = moduleRef.get(ProductDetailService);
    catalog = moduleRef.get(CatalogService);
  });

  beforeEach(async () => {
    await cleanProductDetailFixtures(prisma);
    await createProductDetailFixtures(prisma, true);
  });

  afterAll(async () => {
    if (prisma) await cleanProductDetailFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns only the public PDP projection and active listings', async () => {
    const response = await productDetail.get(
      PDP.productId,
      EMPTY_DETAIL_QUERY,
      null,
    );

    expect(response.data).toMatchObject({
      id: PDP.productId,
      brand: { id: PDP.brandId, name: 'PDP Test Brand' },
      category: { id: PDP.categoryId, name: 'PDP Test Category' },
    });
    expect(response.data.variants).toHaveLength(4);
    expect(response.data.variants.map(({ id }) => id)).not.toContain(
      PDP.hiddenVariantId,
    );
    expect(response.data.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: PDP.exactVariantId,
          fitment: {
            status: 'unknown',
            reasonCode: 'VEHICLE_NOT_SELECTED',
            matchedRule: null,
          },
          listings: [
            expect.objectContaining({
              condition: 'NEW',
              price: '110',
              inStock: true,
              supplier: {
                id: PDP.supplierId,
                name: 'PDP Public Supplier',
                slug: 'pdp-public-supplier',
              },
            }),
          ],
        }),
      ]),
    );
    expect(response.data.variants[0].listings[0]).not.toHaveProperty(
      'stockQuantity',
    );
    expect(response.data.variants[0].listings[0].supplier).not.toHaveProperty(
      'users',
    );
  });

  it('applies exact-engine precedence consistently in PDP and catalog', async () => {
    const query = {
      ...EMPTY_DETAIL_QUERY,
      year: 2020,
      generationId: PDP.generationId,
      engineTypeId: PDP.engineId,
    };
    const detail = await productDetail.get(PDP.productId, query, null);
    const answers = new Map(
      detail.data.variants.map(({ id, fitment }) => [id, fitment]),
    );

    expect(answers.get(PDP.exactVariantId)).toMatchObject({
      status: 'incompatible',
      reasonCode: 'EXACT_ENGINE_EXCLUSION',
      matchedRule: { scope: 'ENGINE', engineTypeId: PDP.engineId },
    });
    expect(answers.get(PDP.generationVariantId)).toMatchObject({
      status: 'compatible',
      reasonCode: 'GENERATION_MATCH',
      matchedRule: { scope: 'GENERATION', engineTypeId: null },
    });
    expect(answers.get(PDP.engineOnlyVariantId)).toMatchObject({
      status: 'unknown',
      reasonCode: 'NO_FITMENT_DATA',
    });
    expect(answers.get(PDP.unknownVariantId)).toMatchObject({
      status: 'unknown',
      reasonCode: 'NO_FITMENT_DATA',
    });

    const catalogResult = await catalog.list(
      { ...BASE_CATALOG_QUERY, ...query },
      null,
    );
    const catalogVariantIds = catalogResult.data.flatMap(({ variants }) =>
      variants.map(({ id }) => id),
    );
    const compatiblePdpVariantIds = detail.data.variants
      .filter(({ fitment }) => fitment.status === 'compatible')
      .map(({ id }) => id);
    expect(catalogVariantIds).toEqual(compatiblePdpVariantIds);
  });

  it('returns caution for partial engine coverage without claiming compatibility', async () => {
    const detail = await productDetail.get(
      PDP.productId,
      {
        ...EMPTY_DETAIL_QUERY,
        year: 2020,
        generationId: PDP.generationId,
      },
      null,
    );
    const answers = new Map(
      detail.data.variants.map(({ id, fitment }) => [id, fitment]),
    );

    expect(answers.get(PDP.engineOnlyVariantId)).toMatchObject({
      status: 'caution',
      reasonCode: 'ENGINE_REQUIRED',
      matchedRule: null,
    });
    expect(answers.get(PDP.unknownVariantId)).toMatchObject({
      status: 'unknown',
      reasonCode: 'NO_FITMENT_DATA',
    });
  });

  it('enforces saved-vehicle ownership and distinct product availability errors', async () => {
    const savedVehicle = await prisma.savedVehicle.create({
      data: {
        userId: PDP.ownerId,
        year: 2020,
        vehicleGenerationId: PDP.generationId,
        engineTypeId: PDP.engineId,
      },
    });
    const query = {
      ...EMPTY_DETAIL_QUERY,
      savedVehicleId: savedVehicle.id,
    };

    await expect(
      productDetail.get(PDP.productId, query, PDP.ownerId),
    ).resolves.toMatchObject({ data: { id: PDP.productId } });
    await expect(
      productDetail.get(PDP.productId, query, PDP.otherUserId),
    ).rejects.toThrow('Saved vehicle not found');
    await expect(productDetail.get(PDP.productId, query, null)).rejects.toThrow(
      'Authentication required for savedVehicleId',
    );
    await expect(
      productDetail.get(
        '7a000000-0000-4000-8000-000000000099',
        EMPTY_DETAIL_QUERY,
        null,
      ),
    ).rejects.toThrow('Product not found');
    await expect(
      productDetail.get(PDP.unavailableProductId, EMPTY_DETAIL_QUERY, null),
    ).rejects.toThrow('Product is not publicly available');
  });
});
