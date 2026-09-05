"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cursor = searchParams.get("notesCursor");
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

  function setCursor(nextCursor: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextCursor) next.set("notesCursor", nextCursor);
    else next.delete("notesCursor");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <section className={styles.panel} aria-labelledby={`notes-${target.type}-${target.id}`}>
      <header className={styles.heading}>
        <p>Тільки для внутрішніх ролей</p>
        <h3 id={`notes-${target.type}-${target.id}`}>Внутрішні нотатки</h3>
        <p>Текст нотаток не потрапляє до відповідей клієнта або постачальника.</p>
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
            {correctsNoteId ? `Корекція нотатки ${correctsNoteId}` : "Нова нотатка"}
          </label>
          <textarea
            id={`note-body-${target.id}`}
            name="body"
            value={body}
            maxLength={4000}
            autoComplete="off"
            placeholder="Додайте контекст для внутрішньої команди…"
            onChange={(event) => setBody(event.target.value)}
          />
          <span className={styles.characterCount}>{body.length} / 4000</span>
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={createNote.isPending || !body.trim()}>
            {createNote.isPending ? "Додаємо…" : correctsNoteId ? "Додати корекцію" : "Додати нотатку"}
          </Button>
          {correctsNoteId ? (
            <Button type="button" variant="outline" onClick={() => setCorrectsNoteId(null)}>
              Скасувати корекцію
            </Button>
          ) : null}
        </div>
      </form>
      {createNote.error ? <p className={styles.error} role="alert">{internalMutationError(createNote.error)}</p> : null}
      {createNote.isSuccess ? <p className={styles.success} aria-live="polite">Нотатку додано до внутрішньої історії.</p> : null}

      {notes.isPending ? <p role="status">Завантажуємо нотатки…</p> : null}
      {notes.isError ? (
        <div className={styles.error} role="alert">
          Нотатки недоступні. <Button type="button" variant="outline" onClick={() => void notes.refetch()}>Повторити</Button>
        </div>
      ) : null}
      {notes.data?.data.length === 0 ? <p className={styles.muted}>Внутрішніх нотаток ще немає.</p> : null}
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
          Старіші нотатки
        </Button>
      ) : null}
      {cursor ? <Button type="button" variant="outline" onClick={() => setCursor(null)}>До нових нотаток</Button> : null}
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
  const confirmationId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (confirmRedaction) reasonRef.current?.focus();
  }, [confirmRedaction]);
  const redact = useMutation({
    mutationFn: () => redactInternalNote(note.id, reason.trim()),
    onSuccess: async () => {
      setConfirmRedaction(false);
      setReason("");
      await onChanged();
    },
  });
  function cancelRedaction() {
    setConfirmRedaction(false);
    setReason("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  return (
    <article className={styles.note} data-redacted={note.isRedacted}>
      <div className={styles.toolbar}>
        <strong>{note.isRedacted ? "Нотатку приховано" : note.author.name}</strong>
        <span className={styles.meta}>{formatInternalDate(note.createdAt)} · {note.author.role}</span>
      </div>
      {note.isRedacted ? (
        <p>Вміст приховано. Причина: {note.redactionReason ?? "Не вказано"}.</p>
      ) : (
        <p>{note.body}</p>
      )}
      {note.correctsNoteId ? <p className={styles.meta}>Коригує нотатку: <span translate="no">{note.correctsNoteId}</span></p> : null}
      {!note.isRedacted ? (
        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onCorrect}>Створити корекцію</Button>
          {isAdmin ? <Button ref={triggerRef} type="button" variant="destructive" aria-expanded={confirmRedaction} aria-controls={confirmationId} onClick={() => setConfirmRedaction(true)}>Приховати</Button> : null}
        </div>
      ) : null}
      {confirmRedaction ? (
        <div id={confirmationId} className={styles.confirmation} role="group" aria-label="Підтвердження приховування нотатки">
          <div className={styles.field}>
            <label htmlFor={`redaction-${note.id}`}>Причина приховування</label>
            <textarea ref={reasonRef} id={`redaction-${note.id}`} value={reason} maxLength={500} autoComplete="off" onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className={styles.actions}>
            <Button type="button" variant="destructive" disabled={!reason.trim() || redact.isPending} onClick={() => redact.mutate()}>
              {redact.isPending ? "Приховуємо…" : "Підтвердити приховування"}
            </Button>
            <Button type="button" variant="outline" onClick={cancelRedaction}>Скасувати</Button>
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
