import 'dotenv/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ActivityService } from '../src/internal-ops/activity/activity.service';
import { ActivityQueryPipe } from '../src/internal-ops/activity/activity.validation';
import { InternalOpsModule } from '../src/internal-ops/internal-ops.module';
import { InternalNotesService } from '../src/internal-ops/notes/internal-notes.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  cleanInternalNotesAuditFixtures,
  createInternalNotesAuditFixtures,
  NOTES_ADMIN_ID,
  NOTES_RETURN_ID,
} from './internal-notes-audit.fixtures';
import {
  RETURN_DELIVERED_ORDER_ID,
  RETURN_SUPPORT_ID,
} from './returns.fixtures';

const SUPPORT_ACTOR = {
  id: RETURN_SUPPORT_ID,
  role: 'SUPPORT_MANAGER' as const,
};
const ADMIN_ACTOR = { id: NOTES_ADMIN_ID, role: 'ADMIN' as const };

describe('Internal Notes and ActivityLog integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let notes: InternalNotesService;
  let activity: ActivityService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [InternalOpsModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    notes = moduleRef.get(InternalNotesService);
    activity = moduleRef.get(ActivityService);
  });

  beforeEach(async () => {
    await cleanInternalNotesAuditFixtures(prisma);
    await createInternalNotesAuditFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanInternalNotesAuditFixtures(prisma);
    await moduleRef?.close();
  });

  it('appends Order notes and same-target corrections without mutating history', async () => {
    const target = { type: 'ORDER' as const, id: RETURN_DELIVERED_ORDER_ID };
    const original = await notes.create(
      target,
      { body: 'Customer said the package was damaged', correctsNoteId: null },
      SUPPORT_ACTOR,
    );
    const correction = await notes.create(
      target,
      {
        body: 'Correction: packaging, not part, was damaged',
        correctsNoteId: original.id,
      },
      SUPPORT_ACTOR,
    );

    await expect(
      prisma.note.findUniqueOrThrow({ where: { id: original.id } }),
    ).resolves.toMatchObject({
      body: 'Customer said the package was damaged',
      correctsNoteId: null,
    });
    const listed = await notes.list(target, { limit: 20, cursor: null });
    expect(listed.data.map(({ id }) => id)).toEqual([
      correction.id,
      original.id,
    ]);
    expect(listed.data[0]).toMatchObject({ correctsNoteId: original.id });

    await expect(
      notes.create(
        { type: 'RETURN_REQUEST', id: NOTES_RETURN_ID },
        { body: 'Cross-target correction', correctsNoteId: original.id },
        SUPPORT_ACTOR,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('redacts only the projection while preserving the stored append-only body', async () => {
    const note = await notes.create(
      { type: 'RETURN_REQUEST', id: NOTES_RETURN_ID },
      {
        body: 'Sensitive text that must leave all API responses',
        correctsNoteId: null,
      },
      SUPPORT_ACTOR,
    );
    const redacted = await notes.redact(
      note.id,
      { reason: 'Contains unnecessary sensitive data' },
      ADMIN_ACTOR,
    );

    expect(redacted).toMatchObject({
      body: null,
      isRedacted: true,
      redactionReason: 'Contains unnecessary sensitive data',
      redactedAt: expect.any(String),
    });
    await expect(
      prisma.note.findUniqueOrThrow({ where: { id: note.id } }),
    ).resolves.toMatchObject({
      body: 'Sensitive text that must leave all API responses',
      redactedByUserId: NOTES_ADMIN_ID,
    });
    await expect(
      notes.redact(note.id, { reason: 'Again' }, ADMIN_ACTOR),
    ).rejects.toBeInstanceOf(ConflictException);

    const logs = await activity.list(
      query({ resourceType: 'RETURN_REQUEST', resourceId: NOTES_RETURN_ID }),
      'SUPPORT_MANAGER',
    );
    expect(JSON.stringify(logs)).not.toContain('Sensitive text');
    expect(logs.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'NOTE_REDACTED',
          metadata: { noteId: note.id },
        }),
      ]),
    );
  });

  it('enforces scoped Support audit and allowlisted Admin global filters', async () => {
    const orderNote = await notes.create(
      { type: 'ORDER', id: RETURN_DELIVERED_ORDER_ID },
      { body: 'First operational note', correctsNoteId: null },
      SUPPORT_ACTOR,
    );
    await notes.create(
      { type: 'RETURN_REQUEST', id: NOTES_RETURN_ID },
      { body: 'Separate return note', correctsNoteId: null },
      SUPPORT_ACTOR,
    );
    await prisma.activityLog.create({
      data: {
        actorUserId: NOTES_ADMIN_ID,
        actorRole: 'ADMIN',
        resourceType: 'ORDER',
        resourceId: RETURN_DELIVERED_ORDER_ID,
        action: 'UNSAFE_SYNTHETIC_EVENT',
        metadata: {
          noteId: orderNote.id,
          secret: 'must-not-be-projected',
          paymentPayload: 'must-not-be-projected',
        },
      },
    });

    const support = await activity.list(
      query({
        resourceType: 'ORDER',
        resourceId: RETURN_DELIVERED_ORDER_ID,
        limit: '1',
      }),
      'SUPPORT_MANAGER',
    );
    expect(support.data).toHaveLength(1);
    expect(support.pageInfo).toEqual({
      hasNextPage: true,
      nextCursor: expect.any(String),
    });
    expect(support.data[0]?.metadata).toEqual({ noteId: orderNote.id });
    expect(JSON.stringify(support)).not.toContain('must-not-be-projected');

    const admin = await activity.list(
      query({ action: 'NOTE_CREATED' }),
      'ADMIN',
    );
    expect(admin.data).toHaveLength(2);
    expect(admin.data.map(({ resourceType }) => resourceType).sort()).toEqual([
      'ORDER',
      'RETURN_REQUEST',
    ]);
  });
});

function query(input: Record<string, string>) {
  return new ActivityQueryPipe().transform(input);
}
