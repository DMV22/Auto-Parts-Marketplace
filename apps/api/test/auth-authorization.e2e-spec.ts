import {
  Controller,
  Get,
  INestApplication,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { Roles } from '../src/auth/decorators/roles.decorator';
import { SupplierOwned } from '../src/auth/decorators/supplier-owned.decorator';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { SessionAuthGuard } from '../src/auth/guards/session-auth.guard';
import { SupplierOwnershipGuard } from '../src/auth/guards/supplier-ownership.guard';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

@Controller('test/authorization')
@UseGuards(SessionAuthGuard, RolesGuard)
class AuthorizationProbeController {
  @Get('customer')
  @Roles(UserRole.CUSTOMER)
  customer(): { allowed: true } {
    return { allowed: true };
  }

  @Get('supplier')
  @Roles(UserRole.SUPPLIER_USER)
  supplier(): { allowed: true } {
    return { allowed: true };
  }

  @Get('support')
  @Roles(UserRole.SUPPORT_MANAGER)
  support(): { allowed: true } {
    return { allowed: true };
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  admin(): { allowed: true } {
    return { allowed: true };
  }

  @Get('suppliers/:supplierId/write')
  @Roles(UserRole.SUPPLIER_USER)
  @SupplierOwned('supplierId')
  @UseGuards(SupplierOwnershipGuard)
  supplierWrite(@Param('supplierId') supplierId: string): {
    allowed: true;
    supplierId: string;
  } {
    return { allowed: true, supplierId };
  }
}

describe('RBAC and supplier ownership (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [AuthorizationProbeController],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanIdentityData(prisma);
  });

  afterAll(async () => {
    await cleanIdentityData(prisma);
    await app?.close();
  });

  it('requires a session and enforces the persisted role matrix', async () => {
    await request(app.getHttpServer())
      .get('/test/authorization/customer')
      .expect(401);

    const customer = await authenticatedClient(
      app,
      prisma,
      'customer-rbac@example.test',
      UserRole.CUSTOMER,
    );
    const supplier = await authenticatedClient(
      app,
      prisma,
      'supplier-rbac@example.test',
      UserRole.SUPPLIER_USER,
    );
    const support = await authenticatedClient(
      app,
      prisma,
      'support-rbac@example.test',
      UserRole.SUPPORT_MANAGER,
    );
    const admin = await authenticatedClient(
      app,
      prisma,
      'admin-rbac@example.test',
      UserRole.ADMIN,
    );

    await customer.get('/test/authorization/customer').expect(200);
    await customer.get('/test/authorization/admin').expect(403);
    await supplier.get('/test/authorization/supplier').expect(200);
    await supplier.get('/test/authorization/support').expect(403);
    await support.get('/test/authorization/support').expect(200);
    await support.get('/test/authorization/supplier').expect(403);
    await admin.get('/test/authorization/customer').expect(200);
    await admin.get('/test/authorization/admin').expect(200);
  });

  it('allows only an active matching supplier membership, with Admin bypass', async () => {
    const matchingSupplier = await prisma.supplier.create({
      data: { name: 'Matching Supplier', slug: 'matching-supplier' },
    });
    const otherSupplier = await prisma.supplier.create({
      data: { name: 'Other Supplier', slug: 'other-supplier' },
    });
    const supplierClient = await authenticatedClient(
      app,
      prisma,
      'supplier-owner@example.test',
      UserRole.SUPPLIER_USER,
    );
    const supplierUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'supplier-owner@example.test' },
    });
    await prisma.supplierUser.create({
      data: {
        userId: supplierUser.id,
        supplierId: matchingSupplier.id,
      },
    });

    await supplierClient
      .get(`/test/authorization/suppliers/${matchingSupplier.id}/write`)
      .expect(200);
    await supplierClient
      .get(`/test/authorization/suppliers/${otherSupplier.id}/write`)
      .expect(403);

    await prisma.supplierUser.update({
      where: { userId: supplierUser.id },
      data: { status: 'DISABLED' },
    });
    await supplierClient
      .get(`/test/authorization/suppliers/${matchingSupplier.id}/write`)
      .expect(403);

    const support = await authenticatedClient(
      app,
      prisma,
      'support-owner@example.test',
      UserRole.SUPPORT_MANAGER,
    );
    await support
      .get(`/test/authorization/suppliers/${matchingSupplier.id}/write`)
      .expect(403);

    const admin = await authenticatedClient(
      app,
      prisma,
      'admin-owner@example.test',
      UserRole.ADMIN,
    );
    await admin
      .get(`/test/authorization/suppliers/${otherSupplier.id}/write`)
      .expect(200);
  });
});

async function authenticatedClient(
  app: INestApplication<App>,
  prisma: PrismaService,
  email: string,
  role: UserRole,
): Promise<ReturnType<typeof request.agent>> {
  const client = request.agent(app.getHttpServer());
  await client
    .post('/api/auth/sign-up/email')
    .send({ name: 'Authorization User', email, password: PASSWORD })
    .expect(200);
  await prisma.user.update({ where: { email }, data: { role } });

  return client;
}

async function cleanIdentityData(prisma: PrismaService): Promise<void> {
  await prisma.supplierUser.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}
