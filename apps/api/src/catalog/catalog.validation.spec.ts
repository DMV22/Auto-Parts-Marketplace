import { BadRequestException } from '@nestjs/common';
import { CatalogQueryPipe } from './catalog.validation';

const GENERATION_ID = '73000000-0000-4000-8000-000000000001';
const ENGINE_ID = '74000000-0000-4000-8000-000000000001';

describe('CatalogQueryPipe', () => {
  const pipe = new CatalogQueryPipe();

  it('normalizes catalog filters and bounded pagination', () => {
    expect(
      pipe.transform({
        q: '  brake pad  ',
        condition: 'USED',
        currency: 'uah',
        minPrice: '100.50',
        maxPrice: '900',
        inStock: 'true',
        year: '2020',
        generationId: GENERATION_ID,
        engineTypeId: ENGINE_ID,
        page: '2',
        pageSize: '50',
        sort: 'price_asc',
      }),
    ).toEqual(
      expect.objectContaining({
        q: 'brake pad',
        condition: 'USED',
        currency: 'UAH',
        minPrice: '100.50',
        maxPrice: '900',
        inStock: true,
        year: 2020,
        generationId: GENERATION_ID,
        engineTypeId: ENGINE_ID,
        savedVehicleId: null,
        page: 2,
        pageSize: 50,
        sort: 'price_asc',
      }),
    );
  });

  it.each([
    [{ unexpected: 'value' }],
    [{ minPrice: '10' }],
    [{ currency: 'UAH', minPrice: '20', maxPrice: '10' }],
    [{ year: '2020' }],
    [{ generationId: GENERATION_ID }],
    [
      {
        year: '2020',
        generationId: GENERATION_ID,
        savedVehicleId: GENERATION_ID,
      },
    ],
    [{ pageSize: '51' }],
    [{ sort: 'price_desc' }],
  ])('rejects malformed or conflicting query: %j', (query) => {
    expect(() => pipe.transform(query)).toThrow(BadRequestException);
  });
});
