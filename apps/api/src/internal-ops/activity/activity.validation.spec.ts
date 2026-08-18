import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { assertActivityReadScope } from './activity.policy';
import { ActivityQueryPipe, encodeActivityCursor } from './activity.validation';

const RESOURCE_ID = 'c2000000-0000-4000-8000-000000000001';
const ACTOR_ID = 'c2000000-0000-4000-8000-000000000002';
const CREATED_AT = '2026-08-14T10:00:00.000Z';

describe('ActivityLog query validation and scope', () => {
  it('accepts only allowlisted filters and an opaque bounded cursor', () => {
    const query = new ActivityQueryPipe().transform({
      actorId: ACTOR_ID,
      action: 'RETURN_REQUEST_CREATED',
      resourceType: 'RETURN_REQUEST',
      resourceId: RESOURCE_ID,
      createdFrom: '2026-08-01T00:00:00.000Z',
      createdTo: '2026-08-14T23:59:59.000Z',
      limit: '50',
      cursor: encodeActivityCursor({ id: RESOURCE_ID, createdAt: CREATED_AT }),
    });
    expect(query).toEqual({
      actorId: ACTOR_ID,
      action: 'RETURN_REQUEST_CREATED',
      resourceType: 'RETURN_REQUEST',
      resourceId: RESOURCE_ID,
      createdFrom: new Date('2026-08-01T00:00:00.000Z'),
      createdTo: new Date('2026-08-14T23:59:59.000Z'),
      limit: 50,
      cursor: { id: RESOURCE_ID, createdAt: new Date(CREATED_AT) },
    });
  });

  it.each([
    [{ resourceType: 'UNKNOWN' }],
    [{ actorId: 'bad-id' }],
    [{ resourceId: 'bad-id' }],
    [{ action: '' }],
    [{ limit: '0' }],
    [{ cursor: 'invalid' }],
    [{ unknown: 'value' }],
  ])('rejects an unsafe audit query: %j', (query) => {
    expect(() => new ActivityQueryPipe().transform(query)).toThrow(
      BadRequestException,
    );
  });

  it('requires SupportManager to scope reads to one Order or ReturnRequest', () => {
    const pipe = new ActivityQueryPipe();
    expect(() =>
      assertActivityReadScope(UserRole.SUPPORT_MANAGER, pipe.transform({})),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertActivityReadScope(
        UserRole.SUPPORT_MANAGER,
        pipe.transform({ resourceType: 'NOTE', resourceId: RESOURCE_ID }),
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertActivityReadScope(
        UserRole.SUPPORT_MANAGER,
        pipe.transform({ resourceType: 'ORDER', resourceId: RESOURCE_ID }),
      ),
    ).not.toThrow();
    expect(() =>
      assertActivityReadScope(UserRole.ADMIN, pipe.transform({})),
    ).not.toThrow();
  });
});
