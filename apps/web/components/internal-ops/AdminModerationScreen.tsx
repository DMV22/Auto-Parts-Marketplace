"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import { moderateListing } from "@/lib/internal-ops/internal-ops-api";
import { formatInternalDate, internalMutationError } from "@/lib/internal-ops/internal-ops-presentation";
import { localDateTimeToIso, toDateTimeLocal } from "@/lib/internal-ops/internal-ops-route-query";
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

  if (queue.isPending) return <p role="status">Завантажуємо moderation queue…</p>;
  if (queue.isError) return <section className={styles.state}><h1>Moderation queue недоступна</h1><p>Лише Admin може читати та змінювати moderation state.</p><Button type="button" variant="outline" onClick={() => void queue.refetch()}>Спробувати ще раз</Button></section>;
  return (
    <section className={styles.workspace} aria-labelledby="moderation-title">
      <div className={styles.toolbar}><header className={styles.heading}><p>Admin workspace</p><h1 id="moderation-title">Listing moderation</h1></header><Link href="/internal/orders">До Internal Ops</Link></div>
      <form className={styles.filters} onSubmit={applyFilters}>
        <div className={styles.field}><label htmlFor="moderation-status">Статус</label><select id="moderation-status" name="status" defaultValue={query.status ?? "PENDING_APPROVAL"}><option value="PENDING_APPROVAL">Pending approval</option><option value="ACTIVE">Active</option><option value="REJECTED">Rejected</option><option value="PAUSED">Paused</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></div>
        <div className={styles.field}><label htmlFor="moderation-condition">Стан товару</label><select id="moderation-condition" name="condition" defaultValue={query.condition ?? ""}><option value="">Усі</option><option value="NEW">Новий</option><option value="USED">Вживаний</option><option value="REMANUFACTURED">Відновлений</option></select></div>
        <div className={styles.field}><label htmlFor="moderation-supplier">Supplier ID</label><input id="moderation-supplier" name="supplierId" defaultValue={query.supplierId ?? ""} autoComplete="off" spellCheck={false} /></div>
        <div className={styles.field}><label htmlFor="moderation-from">Створено від</label><input id="moderation-from" name="createdFrom" type="datetime-local" defaultValue={toDateTimeLocal(query.createdFrom)} autoComplete="off" /></div>
        <div className={styles.field}><label htmlFor="moderation-to">Створено до</label><input id="moderation-to" name="createdTo" type="datetime-local" defaultValue={toDateTimeLocal(query.createdTo)} autoComplete="off" /></div>
        <Button type="submit">Застосувати</Button>
      </form>
      {queue.data.data.length === 0 ? <div className={styles.state}>Listings за цими фільтрами відсутні.</div> : <ul className={styles.list}>{queue.data.data.map((listing) => <li key={listing.id}><ModerationCard listing={listing} /></li>)}</ul>}
      {queue.data.meta.nextCursor ? <div className={styles.pagination}><Link href={moderationNextHref(query, queue.data.meta.nextCursor)}>Наступна сторінка</Link></div> : null}
    </section>
  );
}

function ModerationCard({ listing }: { listing: SupplierListing & { supplier: { id: string; name: string } } }) {
  const [action, setAction] = useState<"reject" | "pause" | null>(null);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
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
  return (
    <article className={styles.moderationCard}>
      <div className={styles.toolbar}><div><strong>{listing.productVariant.sku}</strong><p className={styles.meta}>{listing.supplier.name}</p></div><span className={styles.badge}>{listing.status}</span></div>
      <dl className={styles.summary}><div><dt>Listing</dt><dd translate="no">{listing.id}</dd></div><div><dt>Supplier</dt><dd translate="no">{listing.supplierId}</dd></div><div><dt>Ціна</dt><dd>{formatMoney(listing.price, listing.currency)}</dd></div><div><dt>Створено</dt><dd>{formatInternalDate(listing.createdAt)}</dd></div></dl>
      <div className={styles.actions}>
        {canDecide ? <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate("approve")}>Approve</Button> : null}
        {canDecide ? <Button type="button" variant="destructive" onClick={() => setAction("reject")}>Reject…</Button> : null}
        {canPause ? <Button type="button" variant="destructive" onClick={() => setAction("pause")}>Emergency pause…</Button> : null}
      </div>
      {action ? <div className={styles.confirmation}><div className={styles.field}><label htmlFor={`moderation-reason-${listing.id}`}>{action === "reject" ? "Supplier-visible rejection reason" : "Supplier-visible pause reason"}</label><textarea id={`moderation-reason-${listing.id}`} value={reason} maxLength={500} autoComplete="off" onChange={(event) => setReason(event.target.value)} /></div><div className={styles.actions}><Button type="button" variant="destructive" disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate(action)}>{mutation.isPending ? "Застосовуємо…" : `Підтвердити ${action}`}</Button><Button type="button" variant="outline" onClick={() => setAction(null)}>Скасувати</Button></div></div> : null}
      {mutation.error ? <p className={styles.error} role="alert">{internalMutationError(mutation.error)}</p> : null}
      {mutation.isSuccess ? <p className={styles.success} aria-live="polite">Moderation outcome підтверджено backend; public catalog cache позначено stale.</p> : null}
    </article>
  );
}

function moderationNextHref(query: ModerationQuery, cursor: string) {
  const search = new URLSearchParams();
  Object.entries({ ...query, cursor, pageSize: undefined }).forEach(([key, value]) => { if (value !== undefined) search.set(key, String(value)); });
  return `/admin/moderation?${search}`;
}
