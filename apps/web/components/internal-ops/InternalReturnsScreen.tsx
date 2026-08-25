"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  formatInternalDate,
  presentReturnStatus,
} from "@/lib/internal-ops/internal-ops-presentation";
import { localDateTimeToIso, toDateTimeLocal } from "@/lib/internal-ops/internal-ops-route-query";
import type { InternalReturnsQuery, ReturnRequestStatus } from "@/lib/internal-ops/internal-ops-types";
import { internalReturnsQueryOptions } from "@/lib/query/internal-ops-queries";
import { ReturnStatusBadge } from "./InternalStatusBadge";
import styles from "./internal-ops.module.css";

const returnStatuses: ReturnRequestStatus[] = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RECEIVED", "COMPLETED", "CANCELLED"];

export function InternalReturnsScreen({ query }: { query: InternalReturnsQuery }) {
  const returns = useQuery(internalReturnsQueryOptions(query));
  const router = useRouter();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const search = new URLSearchParams();
    const status = form.get("status");
    if (typeof status === "string" && status) search.set("status", status);
    const from = localDateTimeToIso(form.get("createdFrom"));
    const to = localDateTimeToIso(form.get("createdTo"));
    if (from) search.set("createdFrom", from);
    if (to) search.set("createdTo", to);
    router.push(`/internal/returns${search.size ? `?${search}` : ""}`);
  }

  if (returns.isPending) return <p role="status">Завантажуємо чергу повернень…</p>;
  if (returns.isError) {
    return <section className={styles.state}><h2>Черга повернень недоступна</h2><Button type="button" variant="outline" onClick={() => void returns.refetch()}>Спробувати ще раз</Button></section>;
  }

  return (
    <section className={styles.workspace} aria-labelledby="internal-returns-title">
      <header className={styles.heading}><h2 id="internal-returns-title">Черга повернень</h2><p>Статуси змінюються лише через centralized ReturnTransitionPolicy.</p></header>
      <form className={styles.filters} onSubmit={applyFilters}>
        <div className={styles.field}><label htmlFor="return-status">Статус</label><select id="return-status" name="status" defaultValue={query.status ?? ""}><option value="">Усі</option>{returnStatuses.map((status) => <option key={status} value={status}>{presentReturnStatus(status)}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="returns-from">Створено від</label><input id="returns-from" name="createdFrom" type="datetime-local" defaultValue={toDateTimeLocal(query.createdFrom)} autoComplete="off" /></div>
        <div className={styles.field}><label htmlFor="returns-to">Створено до</label><input id="returns-to" name="createdTo" type="datetime-local" defaultValue={toDateTimeLocal(query.createdTo)} autoComplete="off" /></div>
        <Button type="submit">Застосувати</Button>
      </form>
      {returns.data.data.length === 0 ? <div className={styles.state}>ReturnRequest за цими фільтрами немає.</div> : (
        <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th scope="col">Return</th><th scope="col">Товар</th><th scope="col">Статус</th><th scope="col">Причина</th><th scope="col">Дата</th><th scope="col">Дія</th></tr></thead><tbody>{returns.data.data.map((item) => <tr key={item.id}><td translate="no">{item.id}</td><td>{item.productName ?? "Snapshot товару"}<br /><span className={styles.meta}>{item.sku ?? "SKU недоступний"}</span></td><td><ReturnStatusBadge status={item.status} /></td><td>{item.reason}</td><td>{formatInternalDate(item.createdAt)}</td><td><Link href={`/internal/returns/${item.id}`}>Деталі</Link></td></tr>)}</tbody></table></div>
      )}
      {returns.data.pageInfo.nextCursor ? <div className={styles.pagination}><Link href={returnsNextHref(query, returns.data.pageInfo.nextCursor)}>Наступна сторінка</Link></div> : null}
    </section>
  );
}

function returnsNextHref(query: InternalReturnsQuery, cursor: string) {
  const search = new URLSearchParams();
  Object.entries({ ...query, cursor, limit: undefined }).forEach(([key, value]) => { if (value !== undefined) search.set(key, String(value)); });
  return `/internal/returns?${search}`;
}
