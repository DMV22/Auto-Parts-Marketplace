import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import type { ActivityResourceType, UserRole } from '../generated/prisma/enums';

export type ActivityLogRecord = {
  actorUserId: string;
  actorRole: UserRole;
  resourceType: ActivityResourceType;
  resourceId: string;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class ActivityLogService {
  async record(
    transaction: Prisma.TransactionClient,
    input: ActivityLogRecord,
  ): Promise<void> {
    await transaction.activityLog.create({
      data: input,
      select: { id: true },
    });
  }
}
