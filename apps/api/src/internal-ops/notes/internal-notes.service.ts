import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ActivityResourceType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log.service';
import type {
  CreateNoteCommand,
  InternalActor,
  InternalNoteItem,
  InternalNotesResponse,
  NotesQuery,
  NoteTarget,
  RedactNoteCommand,
} from './internal-notes.types';
import { encodeNoteCursor } from './internal-notes.validation';

const NOTE_SELECT = {
  id: true,
  orderId: true,
  returnRequestId: true,
  authorUserId: true,
  correctsNoteId: true,
  body: true,
  redactedAt: true,
  redactionReason: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.NoteSelect;

type SelectedNote = Prisma.NoteGetPayload<{ select: typeof NOTE_SELECT }>;

@Injectable()
export class InternalNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(
    target: NoteTarget,
    command: CreateNoteCommand,
    actor: InternalActor,
  ): Promise<InternalNoteItem> {
    return this.prisma.$transaction(async (transaction) => {
      await requireTarget(transaction, target);
      if (command.correctsNoteId) {
        const corrected = await transaction.note.findFirst({
          where: { id: command.correctsNoteId, ...targetWhere(target) },
          select: { id: true },
        });
        if (!corrected) throw noteNotFound();
      }

      const note = await transaction.note.create({
        data: {
          ...targetData(target),
          authorUserId: actor.id,
          body: command.body,
          correctsNoteId: command.correctsNoteId,
        },
        select: NOTE_SELECT,
      });
      await this.activityLog.record(transaction, {
        actorUserId: actor.id,
        actorRole: actor.role,
        resourceType: targetResourceType(target),
        resourceId: target.id,
        action: command.correctsNoteId
          ? 'NOTE_CORRECTION_CREATED'
          : 'NOTE_CREATED',
        metadata: {
          noteId: note.id,
          ...(command.correctsNoteId
            ? { correctsNoteId: command.correctsNoteId }
            : {}),
        },
      });
      return projectNote(note);
    });
  }

  async list(
    target: NoteTarget,
    query: NotesQuery,
  ): Promise<InternalNotesResponse> {
    await requireTarget(this.prisma, target);
    const where = targetWhere(target);
    if (query.cursor && !(await this.isCursor(where, query.cursor))) {
      return emptyPage();
    }
    const rows = await this.prisma.note.findMany({
      where: {
        ...where,
        ...(query.cursor ? { OR: afterCursor(query.cursor) } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: NOTE_SELECT,
    });
    const hasNextPage = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      data: page.map(projectNote),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeNoteCursor({ id: last.id, createdAt: last.createdAt })
            : null,
      },
    };
  }

  async redact(
    noteId: string,
    command: RedactNoteCommand,
    actor: InternalActor,
  ): Promise<InternalNoteItem> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.note.findUnique({
        where: { id: noteId },
        select: NOTE_SELECT,
      });
      if (!existing) throw noteNotFound();
      if (existing.redactedAt) {
        throw new ConflictException('Note is already redacted');
      }
      const redacted = await transaction.note.update({
        where: { id: noteId },
        data: {
          redactedAt: new Date(),
          redactedByUserId: actor.id,
          redactionReason: command.reason,
        },
        select: NOTE_SELECT,
      });
      const target = noteTarget(redacted);
      await this.activityLog.record(transaction, {
        actorUserId: actor.id,
        actorRole: actor.role,
        resourceType: targetResourceType(target),
        resourceId: target.id,
        action: 'NOTE_REDACTED',
        reason: command.reason,
        metadata: { noteId: redacted.id },
      });
      return projectNote(redacted);
    });
  }

  private async isCursor(
    where: Prisma.NoteWhereInput,
    cursor: { id: string; createdAt: Date },
  ): Promise<boolean> {
    return !!(await this.prisma.note.findFirst({
      where: { ...where, id: cursor.id, createdAt: cursor.createdAt },
      select: { id: true },
    }));
  }
}

function projectNote(note: SelectedNote): InternalNoteItem {
  return {
    id: note.id,
    target: noteTarget(note),
    author: note.author,
    body: note.redactedAt ? null : note.body,
    isRedacted: note.redactedAt !== null,
    correctsNoteId: note.correctsNoteId,
    redactedAt: note.redactedAt?.toISOString() ?? null,
    redactionReason: note.redactionReason,
    createdAt: note.createdAt.toISOString(),
  };
}

function noteTarget(note: {
  orderId: string | null;
  returnRequestId: string | null;
}): NoteTarget {
  if (note.orderId) return { type: 'ORDER', id: note.orderId };
  if (note.returnRequestId) {
    return { type: 'RETURN_REQUEST', id: note.returnRequestId };
  }
  throw new Error('Note target invariant violated');
}

function targetWhere(target: NoteTarget): Prisma.NoteWhereInput {
  return target.type === 'ORDER'
    ? { orderId: target.id }
    : { returnRequestId: target.id };
}

function targetData(target: NoteTarget): {
  orderId?: string;
  returnRequestId?: string;
} {
  return target.type === 'ORDER'
    ? { orderId: target.id }
    : { returnRequestId: target.id };
}

function targetResourceType(target: NoteTarget): ActivityResourceType {
  return target.type === 'ORDER'
    ? ActivityResourceType.ORDER
    : ActivityResourceType.RETURN_REQUEST;
}

async function requireTarget(
  prisma: Pick<Prisma.TransactionClient, 'order' | 'returnRequest'>,
  target: NoteTarget,
): Promise<void> {
  const found =
    target.type === 'ORDER'
      ? await prisma.order.findUnique({
          where: { id: target.id },
          select: { id: true },
        })
      : await prisma.returnRequest.findUnique({
          where: { id: target.id },
          select: { id: true },
        });
  if (!found) throw targetNotFound(target.type);
}

function afterCursor(cursor: { id: string; createdAt: Date }) {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
  ];
}

function emptyPage(): InternalNotesResponse {
  return { data: [], pageInfo: { nextCursor: null, hasNextPage: false } };
}

function noteNotFound(): NotFoundException {
  return new NotFoundException('Note not found');
}

function targetNotFound(type: NoteTarget['type']): NotFoundException {
  return new NotFoundException(
    type === 'ORDER' ? 'Order not found' : 'ReturnRequest not found',
  );
}
