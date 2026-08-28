import type { UserRole } from '../../generated/prisma/enums';
import type { PageInfo } from '../../commerce/orders/orders.types';

export type InternalActor = { id: string; role: UserRole };

export type NoteTarget =
  | { type: 'ORDER'; id: string }
  | { type: 'RETURN_REQUEST'; id: string };

export type CreateNoteCommand = {
  body: string;
  correctsNoteId: string | null;
};

export type RedactNoteCommand = { reason: string };

export type NoteCursor = { id: string; createdAt: Date };
export type NotesQuery = { limit: number; cursor: NoteCursor | null };

export type InternalNoteItem = {
  id: string;
  target: NoteTarget;
  author: { id: string; name: string; role: UserRole };
  body: string | null;
  isRedacted: boolean;
  correctsNoteId: string | null;
  redactedAt: string | null;
  redactionReason: string | null;
  createdAt: string;
};

export type InternalNotesResponse = {
  data: InternalNoteItem[];
  pageInfo: PageInfo;
};
