"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createInternalNote,
  redactInternalNote,
} from "@/lib/internal-ops/internal-ops-api";
import {
  formatInternalDate,
  internalMutationError,
} from "@/lib/internal-ops/internal-ops-presentation";
import type { InternalNote, NoteTarget } from "@/lib/internal-ops/internal-ops-types";
import { internalNotesQueryOptions } from "@/lib/query/internal-ops-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./internal-ops.module.css";

export function InternalNotesPanel({ target }: { target: NoteTarget }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [correctsNoteId, setCorrectsNoteId] = useState<string | null>(null);
  const notes = useQuery(internalNotesQueryOptions(target, cursor));
  const session = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const createNote = useMutation({
    mutationFn: () => createInternalNote(target, body.trim(), correctsNoteId),
    onSuccess: async () => {
      setBody("");
      setCorrectsNoteId(null);
      setCursor(null);
      await invalidateNotesAndActivity(queryClient, target);
    },
  });

  return (
    <section className={styles.panel} aria-labelledby={`notes-${target.type}-${target.id}`}>
      <header className={styles.heading}>
        <h3 id={`notes-${target.type}-${target.id}`}>Internal Notes</h3>
        <p>Текст доступний лише SupportManager/Admin і не копіюється в ActivityLog metadata.</p>
      </header>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim()) createNote.mutate();
        }}
      >
        <div className={styles.field}>
          <label htmlFor={`note-body-${target.id}`}>
            {correctsNoteId ? `Корекція note ${correctsNoteId}` : "Нова internal note"}
          </label>
          <textarea
            id={`note-body-${target.id}`}
            name="body"
            value={body}
            maxLength={4000}
            autoComplete="off"
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={createNote.isPending || !body.trim()}>
            {createNote.isPending ? "Додаємо…" : correctsNoteId ? "Додати корекцію" : "Додати note"}
          </Button>
          {correctsNoteId ? (
            <Button type="button" variant="outline" onClick={() => setCorrectsNoteId(null)}>
              Скасувати корекцію
            </Button>
          ) : null}
        </div>
      </form>
      {createNote.error ? <p className={styles.error} role="alert">{internalMutationError(createNote.error)}</p> : null}
      {createNote.isSuccess ? <p className={styles.success} aria-live="polite">Note додано як append-only запис.</p> : null}

      {notes.isPending ? <p role="status">Завантажуємо notes…</p> : null}
      {notes.isError ? (
        <div className={styles.error} role="alert">
          Notes недоступні. <Button type="button" variant="outline" onClick={() => void notes.refetch()}>Повторити</Button>
        </div>
      ) : null}
      {notes.data?.data.length === 0 ? <p className={styles.muted}>Internal notes ще немає.</p> : null}
      {notes.data ? (
        <ul className={styles.list}>
          {notes.data.data.map((note) => (
            <li key={note.id}>
              <NoteItem
                note={note}
                isAdmin={session.data?.user.role === "ADMIN"}
                onCorrect={() => setCorrectsNoteId(note.id)}
                onChanged={() => invalidateNotesAndActivity(queryClient, target)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {notes.data?.pageInfo.nextCursor ? (
        <Button type="button" variant="outline" onClick={() => setCursor(notes.data.pageInfo.nextCursor)}>
          Старіші notes
        </Button>
      ) : null}
      {cursor ? <Button type="button" variant="outline" onClick={() => setCursor(null)}>До нових notes</Button> : null}
    </section>
  );
}

function NoteItem({
  note,
  isAdmin,
  onCorrect,
  onChanged,
}: {
  note: InternalNote;
  isAdmin: boolean;
  onCorrect: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const [confirmRedaction, setConfirmRedaction] = useState(false);
  const [reason, setReason] = useState("");
  const redact = useMutation({
    mutationFn: () => redactInternalNote(note.id, reason.trim()),
    onSuccess: async () => {
      setConfirmRedaction(false);
      setReason("");
      await onChanged();
    },
  });
  return (
    <article className={styles.note} data-redacted={note.isRedacted}>
      <div className={styles.toolbar}>
        <strong>{note.isRedacted ? "Note redacted" : note.author.name}</strong>
        <span className={styles.meta}>{formatInternalDate(note.createdAt)} · {note.author.role}</span>
      </div>
      {note.isRedacted ? (
        <p>Вміст приховано. Причина: {note.redactionReason ?? "Не вказано"}.</p>
      ) : (
        <p>{note.body}</p>
      )}
      {note.correctsNoteId ? <p className={styles.meta}>Коригує note: <span translate="no">{note.correctsNoteId}</span></p> : null}
      {!note.isRedacted ? (
        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onCorrect}>Створити корекцію</Button>
          {isAdmin ? <Button type="button" variant="destructive" onClick={() => setConfirmRedaction(true)}>Redact</Button> : null}
        </div>
      ) : null}
      {confirmRedaction ? (
        <div className={styles.confirmation}>
          <div className={styles.field}>
            <label htmlFor={`redaction-${note.id}`}>Причина redaction</label>
            <textarea id={`redaction-${note.id}`} value={reason} maxLength={500} autoComplete="off" onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className={styles.actions}>
            <Button type="button" variant="destructive" disabled={!reason.trim() || redact.isPending} onClick={() => redact.mutate()}>
              {redact.isPending ? "Приховуємо…" : "Підтвердити redaction"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmRedaction(false)}>Скасувати</Button>
          </div>
          {redact.error ? <p className={styles.error} role="alert">{internalMutationError(redact.error)}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

async function invalidateNotesAndActivity(
  queryClient: ReturnType<typeof useQueryClient>,
  target: NoteTarget,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.notesRoot(target.type, target.id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.activityRoot }),
  ]);
}
