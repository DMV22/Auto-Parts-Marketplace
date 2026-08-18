/* eslint-disable @typescript-eslint/no-unsafe-return */
import 'dotenv/config';
import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ActivityLogService } from '../src/internal-ops/activity-log.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupplierListingsService } from '../src/supplier-cabinet/listings/listings.service';
import { AdminModerationQueryPipe } from '../src/supplier-cabinet/listings/listings.validation';
import {
  cleanAdminModerationFixtures,
  createAdminModerationFixtures,
  MODERATION_ACTIVE_ID,
  MODERATION_ADMIN_ID,
  MODERATION_PENDING_A_ID,
  MODERATION_PENDING_B_ID,
  MODERATION_SUPPLIER_ID,
} from './admin-moderation.fixtures';

const ADMIN_ACTOR = { id: MODERATION_ADMIN_ID, role: 'ADMIN' as const };

describe('Admin Listing moderation integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: SupplierListingsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ActivityLogService, SupplierListingsService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(SupplierListingsService);
  });

  beforeEach(async () => {
    await cleanAdminModerationFixtures(prisma);
    await createAdminModerationFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanAdminModerationFixtures(prisma);
    await moduleRef?.close();
  });

  it('returns a bounded deterministic global moderation queue', async () => {
    const first = await service.listModeration(
      new AdminModerationQueryPipe().transform({ pageSize: '1' }),
    );
    expect(first.data).toEqual([
      expect.objectContaining({
        id: MODERATION_PENDING_A_ID,
        status: 'PENDING_APPROVAL',
        supplier: {
          id: MODERATION_SUPPLIER_ID,
          name: 'Admin Moderation Supplier',
        },
      }),
    ]);
    expect(first.meta).toEqual({
      pageSize: 1,
      nextCursor: expect.any(String),
    });
    const second = await service.listModeration(
      new AdminModerationQueryPipe().transform({
        pageSize: '1',
        cursor: first.meta.nextCursor!,
      }),
    );
    expect(second.data.map(({ id }) => id)).toEqual([MODERATION_PENDING_B_ID]);
  });

  it('atomically approves/rejects/pauses and writes supplier-visible reasons plus audit', async () => {
    await expect(
      service.transitionAdminListing(
        MODERATION_PENDING_A_ID,
        'reject',
        'Missing manufacturer evidence',
        ADMIN_ACTOR,
      ),
    ).resolves.toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Missing manufacturer evidence',
      moderationReason: null,
    });
    await expect(
      service.transitionAdminListing(
        MODERATION_PENDING_B_ID,
        'approve',
        undefined,
        ADMIN_ACTOR,
      ),
    ).resolves.toMatchObject({
      status: 'ACTIVE',
      rejectionReason: null,
      moderationReason: null,
    });
    await expect(
      service.transitionAdminListing(
        MODERATION_ACTIVE_ID,
        'pause',
        'Emergency safety review',
        ADMIN_ACTOR,
      ),
    ).resolves.toMatchObject({
      status: 'PAUSED',
      moderationReason: 'Emergency safety review',
    });

    const logs = await prisma.activityLog.findMany({
      where: {
        resourceType: 'LISTING',
        resourceId: {
          in: [
            MODERATION_PENDING_A_ID,
            MODERATION_PENDING_B_ID,
            MODERATION_ACTIVE_ID,
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(logs).toHaveLength(3);
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorUserId: MODERATION_ADMIN_ID,
          actorRole: 'ADMIN',
          action: 'LISTING_EMERGENCY_PAUSED',
          previousStatus: 'ACTIVE',
          newStatus: 'PAUSED',
          reason: 'Emergency safety review',
        }),
      ]),
    );
  });

  it('prevents Supplier resume from overriding an emergency Admin pause', async () => {
    await service.transitionAdminListing(
      MODERATION_ACTIVE_ID,
      'pause',
      'Compliance hold',
      ADMIN_ACTOR,
    );
    await expect(
      service.transitionSupplierListing(
        MODERATION_SUPPLIER_ID,
        MODERATION_ACTIVE_ID,
        'resume',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.get(MODERATION_SUPPLIER_ID, MODERATION_ACTIVE_ID),
    ).resolves.toMatchObject({
      status: 'PAUSED',
      moderationReason: 'Compliance hold',
    });
  });
});
