import type { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanReturnFixtures,
  createReturnFixtures,
  RETURN_DELIVERED_ITEM_ID,
  RETURN_DELIVERED_ORDER_ID,
} from './returns.fixtures';

export const NOTES_RETURN_ID = 'c3000000-0000-4000-8000-000000000001';
export const NOTES_ADMIN_ID = 'c3000000-0000-4000-8000-000000000002';

export async function createInternalNotesAuditFixtures(
  prisma: PrismaService,
  options: {
    createUsers?: boolean;
    createReturn?: boolean;
    customerId?: string;
    otherCustomerId?: string;
  } = {},
): Promise<void> {
  await createReturnFixtures(prisma, {
    createUsers: options.createUsers,
    customerId: options.customerId,
    otherCustomerId: options.otherCustomerId,
  });
  if (options.createUsers ?? true) {
    await prisma.user.create({
      data: {
        id: NOTES_ADMIN_ID,
        name: 'Notes Audit Admin',
        email: 'admin@returns.test',
        emailVerified: true,
        role: 'ADMIN',
      },
    });
  }
  if (options.createReturn ?? true) {
    await prisma.returnRequest.create({
      data: {
        id: NOTES_RETURN_ID,
        orderItemId: RETURN_DELIVERED_ITEM_ID,
        reason: 'Synthetic return for Notes and ActivityLog tests',
      },
    });
  }
}

export async function cleanInternalNotesAuditFixtures(
  prisma: PrismaService,
): Promise<void> {
  const returnIds = (
    await prisma.returnRequest.findMany({
      where: { orderItemId: RETURN_DELIVERED_ITEM_ID },
      select: { id: true },
    })
  ).map(({ id }) => id);
  await prisma.activityLog.deleteMany({
    where: {
      OR: [
        { resourceType: 'ORDER', resourceId: RETURN_DELIVERED_ORDER_ID },
        { resourceType: 'RETURN_REQUEST', resourceId: { in: returnIds } },
      ],
    },
  });
  await prisma.note.deleteMany({
    where: {
      OR: [
        { orderId: RETURN_DELIVERED_ORDER_ID },
        { returnRequestId: { in: returnIds } },
      ],
    },
  });
  await cleanReturnFixtures(prisma);
}
