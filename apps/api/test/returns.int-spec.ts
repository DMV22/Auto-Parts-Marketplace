import 'dotenv/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { InternalOpsModule } from '../src/internal-ops/internal-ops.module';
import { ReturnsService } from '../src/internal-ops/returns/returns.service';
import { InternalReturnsQueryPipe } from '../src/internal-ops/returns/returns.validation';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanReturnFixtures,
  createReturnFixtures,
  RETURN_CUSTOMER_ID,
  RETURN_DELIVERED_ITEM_ID,
  RETURN_DELIVERED_ORDER_ID,
  RETURN_FOREIGN_ITEM_ID,
  RETURN_FOREIGN_ORDER_ID,
  RETURN_GUEST_ITEM_ID,
  RETURN_GUEST_ORDER_ID,
  RETURN_PENDING_ITEM_ID,
  RETURN_PENDING_ORDER_ID,
  RETURN_SUPPORT_ID,
} from './returns.fixtures';

const CUSTOMER_ACTOR = { id: RETURN_CUSTOMER_ID, role: 'CUSTOMER' as const };
const SUPPORT_ACTOR = {
  id: RETURN_SUPPORT_ID,
  role: 'SUPPORT_MANAGER' as const,
};

describe('ReturnsService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: ReturnsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [InternalOpsModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(ReturnsService);
  });

  beforeEach(async () => {
    await cleanReturnFixtures(prisma);
    await createReturnFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanReturnFixtures(prisma);
    await moduleRef?.close();
  });

  it('creates and reads a privacy-safe Customer return with atomic audit', async () => {
    const created = await service.createForCustomer(
      RETURN_DELIVERED_ORDER_ID,
      RETURN_DELIVERED_ITEM_ID,
      { reason: 'Part does not match the delivered vehicle' },
      CUSTOMER_ACTOR,
    );

    expect(created).toMatchObject({
      orderId: RETURN_DELIVERED_ORDER_ID,
      orderItemId: RETURN_DELIVERED_ITEM_ID,
      status: 'REQUESTED',
      decisionReason: null,
    });
    expect(created).not.toHaveProperty('createdByUserId');
    expect(created).not.toHaveProperty('activityLog');
    expect(created).not.toHaveProperty('notes');

    await expect(
      service.listForCustomer(
        RETURN_DELIVERED_ORDER_ID,
        RETURN_DELIVERED_ITEM_ID,
        RETURN_CUSTOMER_ID,
      ),
    ).resolves.toEqual([created]);
    await expect(
      prisma.activityLog.findMany({
        where: { resourceType: 'RETURN_REQUEST', resourceId: created.id },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        actorUserId: RETURN_CUSTOMER_ID,
        actorRole: 'CUSTOMER',
        action: 'RETURN_REQUEST_CREATED',
        previousStatus: null,
        newStatus: 'REQUESTED',
      }),
    ]);
  });

  it('rejects foreign and undelivered items and allows only one unfinished return', async () => {
    await expect(
      service.createForCustomer(
        RETURN_FOREIGN_ORDER_ID,
        RETURN_FOREIGN_ITEM_ID,
        { reason: 'Foreign item' },
        CUSTOMER_ACTOR,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.createForCustomer(
        RETURN_PENDING_ORDER_ID,
        RETURN_PENDING_ITEM_ID,
        { reason: 'Order is not delivered' },
        CUSTOMER_ACTOR,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const concurrent = await Promise.allSettled([
      service.createForCustomer(
        RETURN_DELIVERED_ORDER_ID,
        RETURN_DELIVERED_ITEM_ID,
        { reason: 'Concurrent request A' },
        CUSTOMER_ACTOR,
      ),
      service.createForCustomer(
        RETURN_DELIVERED_ORDER_ID,
        RETURN_DELIVERED_ITEM_ID,
        { reason: 'Concurrent request B' },
        CUSTOMER_ACTOR,
      ),
    ]);
    expect(
      concurrent.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      concurrent.filter(({ status }) => status === 'rejected'),
    ).toHaveLength(1);
    expect(
      await prisma.returnRequest.count({
        where: { orderItemId: RETURN_DELIVERED_ITEM_ID },
      }),
    ).toBe(1);
  });

  it('lets Support create a Guest return and process the complete lifecycle', async () => {
    const created = await service.createForSupport(
      RETURN_GUEST_ORDER_ID,
      RETURN_GUEST_ITEM_ID,
      { reason: 'Guest contacted support' },
      SUPPORT_ACTOR,
    );
    await service.transitionInternal(
      created.id,
      { targetStatus: 'UNDER_REVIEW', reason: null },
      SUPPORT_ACTOR,
    );
    await service.transitionInternal(
      created.id,
      { targetStatus: 'APPROVED', reason: 'Eligible return' },
      SUPPORT_ACTOR,
    );
    await service.transitionInternal(
      created.id,
      { targetStatus: 'RECEIVED', reason: null },
      SUPPORT_ACTOR,
    );
    await expect(
      service.transitionInternal(
        created.id,
        { targetStatus: 'COMPLETED', reason: null },
        SUPPORT_ACTOR,
      ),
    ).resolves.toMatchObject({
      previousStatus: 'RECEIVED',
      status: 'COMPLETED',
    });
    await expect(
      service.transitionInternal(
        created.id,
        { targetStatus: 'UNDER_REVIEW', reason: null },
        SUPPORT_ACTOR,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(service.internalDetail(created.id)).resolves.toMatchObject({
      status: 'COMPLETED',
      decisionReason: 'Eligible return',
      decidedAt: expect.any(String),
      customer: { type: 'GUEST' },
    });
    expect(
      await prisma.activityLog.count({
        where: { resourceType: 'RETURN_REQUEST', resourceId: created.id },
      }),
    ).toBe(5);
  });

  it('allows Customer cancellation only from an eligible owned return', async () => {
    const created = await service.createForCustomer(
      RETURN_DELIVERED_ORDER_ID,
      RETURN_DELIVERED_ITEM_ID,
      { reason: 'Customer return' },
      CUSTOMER_ACTOR,
    );
    await service.transitionInternal(
      created.id,
      { targetStatus: 'UNDER_REVIEW', reason: null },
      SUPPORT_ACTOR,
    );
    await expect(
      service.cancelForCustomer(
        RETURN_DELIVERED_ORDER_ID,
        RETURN_DELIVERED_ITEM_ID,
        created.id,
        CUSTOMER_ACTOR,
      ),
    ).resolves.toMatchObject({
      previousStatus: 'UNDER_REVIEW',
      status: 'CANCELLED',
    });
    await expect(
      service.cancelForCustomer(
        RETURN_DELIVERED_ORDER_ID,
        RETURN_DELIVERED_ITEM_ID,
        created.id,
        CUSTOMER_ACTOR,
      ),
    ).rejects.toThrow();
  });

  it('returns a filtered deterministic internal queue and safe detail DTO', async () => {
    const customerReturn = await service.createForCustomer(
      RETURN_DELIVERED_ORDER_ID,
      RETURN_DELIVERED_ITEM_ID,
      { reason: 'Customer queue return' },
      CUSTOMER_ACTOR,
    );
    await service.createForSupport(
      RETURN_GUEST_ORDER_ID,
      RETURN_GUEST_ITEM_ID,
      { reason: 'Guest queue return' },
      SUPPORT_ACTOR,
    );

    const first = await service.listInternal(
      new InternalReturnsQueryPipe().transform({
        status: 'REQUESTED',
        limit: '1',
      }),
    );
    expect(first.data).toHaveLength(1);
    expect(first.pageInfo).toEqual({
      hasNextPage: true,
      nextCursor: expect.any(String),
    });
    const second = await service.listInternal(
      new InternalReturnsQueryPipe().transform({
        status: 'REQUESTED',
        limit: '1',
        cursor: first.pageInfo.nextCursor!,
      }),
    );
    expect(second.data).toHaveLength(1);
    expect(second.data[0]?.id).not.toBe(first.data[0]?.id);

    const detail = await service.internalDetail(customerReturn.id);
    expect(detail).toMatchObject({
      productName: 'Returns Historic Brake Pad',
      sku: 'RETURNS-HIST-SKU',
      customer: {
        type: 'CUSTOMER',
        id: RETURN_CUSTOMER_ID,
        name: 'Returns Customer',
        email: 'customer@returns.test',
      },
    });
    expect(detail).not.toHaveProperty('activityLog');
    expect(detail).not.toHaveProperty('paymentEvents');
    expect(detail).not.toHaveProperty('guestTokenHash');
    expect(detail).not.toHaveProperty('notes');
  });
});
