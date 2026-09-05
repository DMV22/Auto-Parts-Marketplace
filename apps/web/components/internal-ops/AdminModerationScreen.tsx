"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import { moderateListing } from "@/lib/internal-ops/internal-ops-api";
import { formatInternalDate, internalMutationError } from "@/lib/internal-ops/internal-ops-presentation";
import { internalCursorHref, localDateTimeToIso, toDateTimeLocal } from "@/lib/internal-ops/internal-ops-route-query";
import type { ModerationQuery } from "@/lib/internal-ops/internal-ops-types";
import { moderationQueryOptions } from "@/lib/query/internal-ops-queries";
import { queryKeys } from "@/lib/query/query-keys";
import type { SupplierListing } from "@/lib/supplier/supplier-types";
import styles from "./internal-ops.module.css";

export function AdminModerationScreen({ query }: { query: ModerationQuery }) {
  const queue = useQuery(moderationQueryOptions(query));
  const router = useRouter();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const search = new URLSearchParams();
    for (const key of ["status", "condition", "supplierId"] as const) {
      const value = form.get(key);
      if (typeof value === "string" && value) search.set(key, value);
    }
    const from = localDateTimeToIso(form.get("createdFrom"));
    const to = localDateTimeToIso(form.get("createdTo"));
    if (from) search.set("createdFrom", from);
    if (to) search.set("createdTo", to);
    router.push(`/admin/moderation${search.size ? `?${search}` : ""}`);
  }

  if (queue.isPending) return <section className={styles.state}><h1>Модерація оголошень</h1><p role="status">Завантажуємо чергу…</p></section>;
  if (queue.isError) return <section className={styles.state}><h1>Черга модерації недоступна</h1><p>Перегляд і зміна результату модерації доступні лише адміністратору.</p><Button type="button" variant="outline" onClick={() => void queue.refetch()}>Спробувати ще раз</Button></section>;
  return (
    <section className={styles.workspace} aria-labelledby="moderation-title">
      <header className={styles.heading}><p>Контроль каталогу</p><h1 id="moderation-title">Модерація оголошень</h1><p>Перевіряйте нові пропозиції та фіксуйте результат, який побачить постачальник.</p></header>
      <form className={styles.filters} data-layout="moderation" onSubmit={applyFilters}>
        <div className={styles.field}><label htmlFor="moderation-status">Статус</label><select id="moderation-status" name="status" defaultValue={query.status ?? "PENDING_APPROVAL"}><option value="PENDING_APPROVAL">Очікує перевірки</option><option value="ACTIVE">Опубліковано</option><option value="REJECTED">Відхилено</option><option value="PAUSED">Призупинено</option><option value="DRAFT">Чернетка</option><option value="ARCHIVED">Архів</option></select></div>
        <div className={styles.field}><label htmlFor="moderation-condition">Стан товару</label><select id="moderation-condition" name="condition" defaultValue={query.condition ?? ""}><option value="">Усі</option><option value="NEW">Новий</option><option value="USED">Вживаний</option><option value="REMANUFACTURED">Відновлений</option></select></div>
        <div className={styles.field}><label htmlFor="moderation-supplier">ID постачальника</label><input id="moderation-supplier" name="supplierId" defaultValue={query.supplierId ?? ""} placeholder="UUID постачальника…" autoComplete="off" spellCheck={false} /></div>
        <div className={styles.field}><label htmlFor="moderation-from">Створено від</label><input id="moderation-from" name="createdFrom" type="datetime-local" defaultValue={toDateTimeLocal(query.createdFrom)} autoComplete="off" /></div>
        <div className={styles.field}><label htmlFor="moderation-to">Створено до</label><input id="moderation-to" name="createdTo" type="datetime-local" defaultValue={toDateTimeLocal(query.createdTo)} autoComplete="off" /></div>
        <div className={styles.filterActions}><Link href="/admin/moderation">Скинути</Link><Button type="submit">Застосувати</Button></div>
      </form>
      {queue.data.data.length === 0 ? <div className={styles.state}>Оголошень за цими фільтрами немає.</div> : <ul className={styles.list}>{queue.data.data.map((listing) => <li key={listing.id}><ModerationCard listing={listing} /></li>)}</ul>}
      {queue.data.meta.nextCursor ? <div className={styles.pagination}><Link href={internalCursorHref("/admin/moderation", query, queue.data.meta.nextCursor, "pageSize")}>Наступна сторінка</Link></div> : null}
    </section>
  );
}

function ModerationCard({ listing }: { listing: SupplierListing & { supplier: { id: string; name: string } } }) {
  const [action, setAction] = useState<"reject" | "pause" | null>(null);
  const [reason, setReason] = useState("");
  const confirmationId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const rejectTriggerRef = useRef<HTMLButtonElement>(null);
  const pauseTriggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (action) reasonRef.current?.focus();
  }, [action]);
  const mutation = useMutation({
    mutationFn: (selected: "approve" | "reject" | "pause") => moderateListing(listing.id, selected, reason.trim() || undefined),
    onSuccess: async (updated) => {
      setAction(null);
      setReason("");
      queryClient.setQueryData(queryKeys.supplier.listing(updated.supplierId, updated.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.moderationRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.supplier.listingsRoot(updated.supplierId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.catalog.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.activityRoot }),
      ]);
    },
  });
  const canDecide = listing.status === "PENDING_APPROVAL";
  const canPause = listing.status === "ACTIVE";
  function cancelConfirmation() {
    const trigger = action === "reject" ? rejectTriggerRef : pauseTriggerRef;
    setAction(null);
    setReason("");
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return (
    <article className={styles.moderationCard}>
      <div className={styles.toolbar}><div><strong className={styles.moderationTitle}>{listing.productVariant.sku}</strong><p className={styles.meta}>{listing.supplier.name} · {listing.productVariant.manufacturerPartNumber}</p></div><span className={styles.badge} data-tone={moderationTone(listing.status)}>{moderationStatusLabel(listing.status)}</span></div>
      <dl className={styles.summary}><div><dt>Оголошення</dt><dd translate="no">{listing.id}</dd></div><div><dt>Постачальник</dt><dd translate="no">{listing.supplierId}</dd></div><div><dt>Стан</dt><dd>{conditionLabel(listing.condition)}</dd></div><div><dt>Ціна</dt><dd>{formatMoney(listing.price, listing.currency)}</dd></div><div><dt>Залишок</dt><dd>{listing.stockQuantity}</dd></div><div><dt>Створено</dt><dd><time dateTime={listing.createdAt}>{formatInternalDate(listing.createdAt)}</time></dd></div></dl>
      <div className={styles.actions}>
        {canDecide ? <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate("approve")}>Схвалити</Button> : null}
        {canDecide ? <Button ref={rejectTriggerRef} type="button" variant="destructive" aria-expanded={action === "reject"} aria-controls={confirmationId} onClick={() => setAction("reject")}>Відхилити…</Button> : null}
        {canPause ? <Button ref={pauseTriggerRef} type="button" variant="destructive" aria-expanded={action === "pause"} aria-controls={confirmationId} onClick={() => setAction("pause")}>Екстрено призупинити…</Button> : null}
      </div>
      {action ? <div id={confirmationId} className={styles.confirmation} role="group" aria-label={action === "reject" ? "Підтвердження відхилення оголошення" : "Підтвердження екстреного призупинення"}><div className={styles.field}><label htmlFor={`moderation-reason-${listing.id}`}>{action === "reject" ? "Причина відхилення для постачальника" : "Причина призупинення для постачальника"}</label><textarea ref={reasonRef} id={`moderation-reason-${listing.id}`} value={reason} maxLength={500} placeholder="Опишіть причину конкретно…" autoComplete="off" onChange={(event) => setReason(event.target.value)} /></div><div className={styles.actions}><Button type="button" variant="destructive" disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate(action)}>{mutation.isPending ? "Застосовуємо…" : action === "reject" ? "Підтвердити відхилення" : "Підтвердити призупинення"}</Button><Button type="button" variant="outline" onClick={cancelConfirmation}>Скасувати</Button></div></div> : null}
      {mutation.error ? <p className={styles.error} role="alert">{internalMutationError(mutation.error)}</p> : null}
      {mutation.isSuccess ? <p className={styles.success} aria-live="polite">Результат модерації збережено.</p> : null}
    </article>
  );
}

function moderationStatusLabel(status: SupplierListing["status"]): string {
  return { DRAFT: "Чернетка", PENDING_APPROVAL: "Очікує перевірки", ACTIVE: "Опубліковано", PAUSED: "Призупинено", REJECTED: "Відхилено", ARCHIVED: "Архів" }[status];
}

function moderationTone(status: SupplierListing["status"]): string {
  if (status === "ACTIVE") return "positive";
  if (status === "PENDING_APPROVAL" || status === "PAUSED") return "warning";
  if (status === "REJECTED") return "negative";
  return "neutral";
}

function conditionLabel(condition: SupplierListing["condition"]): string {
  return { NEW: "Новий", USED: "Вживаний", REMANUFACTURED: "Відновлений" }[condition];
}
