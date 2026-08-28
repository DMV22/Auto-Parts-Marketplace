/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { ActivityResourceType as PrismaActivityResourceType } from '../../generated/prisma/enums';
import type { UserRole } from '../../generated/prisma/enums';
import type { PageInfo } from '../../commerce/orders/orders.types';

export type ActivityResource =
  (typeof PrismaActivityResourceType)[keyof typeof PrismaActivityResourceType];

export type ActivityCursor = { id: string; createdAt: Date };

export type ActivityQuery = {
  actorId: string | null;
  action: string | null;
  resourceType: ActivityResource | null;
  resourceId: string | null;
  createdFrom: Date | null;
  createdTo: Date | null;
  limit: number;
  cursor: ActivityCursor | null;
};

export type ActivityItem = {
  id: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  resourceType: ActivityResource;
  resourceId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
};

export type ActivityResponse = { data: ActivityItem[]; pageInfo: PageInfo };
