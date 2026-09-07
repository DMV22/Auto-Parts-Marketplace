import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { assertActivityReadScope } from './activity.policy';
import type { ActivityQuery, ActivityResponse } from './activity.types';
import { encodeActivityCursor } from './activity.validation';

const SAFE_METADATA_KEYS = new Set(['noteId', 'correctsNoteId']);

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ActivityQuery, role: UserRole): Promise<ActivityResponse> {
    assertActivityReadScope(role, query);
    const baseWhere = activityWhere(query);
    if (query.cursor && !(await this.isCursor(baseWhere, query.cursor))) {
      return emptyPage();
    }
    const rows = await this.prisma.activityLog.findMany({
      where: {
        ...baseWhere,
        ...(query.cursor ? { OR: afterCursor(query.cursor) } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: {
        id: true,
        actorUserId: true,
        actorRole: true,
        resourceType: true,
        resourceId: true,
        action: true,
        previousStatus: true,
        newStatus: true,
        reason: true,
        metadata: true,
        createdAt: true,
      },
    });
    const hasNextPage = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      data: page.map((row) => ({
        ...row,
        metadata: safeMetadata(row.metadata),
        createdAt: row.createdAt.toISOString(),
      })),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeActivityCursor({ id: last.id, createdAt: last.createdAt })
            : null,
      },
    };
  }

  private async isCursor(
    where: Prisma.ActivityLogWhereInput,
    cursor: { id: string; createdAt: Date },
  ): Promise<boolean> {
    return !!(await this.prisma.activityLog.findFirst({
      where: { ...where, id: cursor.id, createdAt: cursor.createdAt },
      select: { id: true },
    }));
  }
}

function activityWhere(query: ActivityQuery): Prisma.ActivityLogWhereInput {
  return {
    ...(query.actorId ? { actorUserId: query.actorId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.resourceType ? { resourceType: query.resourceType } : {}),
    ...(query.resourceId ? { resourceId: query.resourceId } : {}),
    ...(query.createdFrom || query.createdTo
      ? {
          createdAt: {
            ...(query.createdFrom ? { gte: query.createdFrom } : {}),
            ...(query.createdTo ? { lte: query.createdTo } : {}),
          },
        }
      : {}),
  };
}

function safeMetadata(value: Prisma.JsonValue): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const safe = Object.entries(value).filter(
    (entry): entry is [string, string] =>
      SAFE_METADATA_KEYS.has(entry[0]) && typeof entry[1] === 'string',
  );
  return safe.length ? Object.fromEntries(safe) : null;
}

function afterCursor(cursor: { id: string; createdAt: Date }) {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
  ];
}

function emptyPage(): ActivityResponse {
  return { data: [], pageInfo: { nextCursor: null, hasNextPage: false } };
}
