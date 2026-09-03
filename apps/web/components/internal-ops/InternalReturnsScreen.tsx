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
import { internalCursorHref, localDateTimeToIso, toDateTimeLocal } from "@/lib/internal-ops/internal-ops-route-query";
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

  if (returns.isPending) {
    return <section className={styles.state}><h2>Черга повернень</h2><p role="status">Завантажуємо запити…</p></section>;
  }
  if (returns.isError) {
    return <section className={styles.state}><h2>Черга повернень недоступна</h2><Button type="button" variant="outline" onClick={() => void returns.refetch()}>Спробувати ще раз</Button></section>;
  }

  return (
    <section className={styles.workspace} aria-labelledby="internal-returns-title">
      <header className={styles.heading}><p>Операційні дані</p><h2 id="internal-returns-title">Черга повернень</h2><p>Переглядайте запити та відкривайте деталі для дозволеної наступної дії.</p></header>
      <form className={styles.filters} onSubmit={applyFilters}>
        <div className={styles.field}><label htmlFor="return-status">Статус</label><select id="return-status" name="status" defaultValue={query.status ?? ""}><option value="">Усі</option>{returnStatuses.map((status) => <option key={status} value={status}>{presentReturnStatus(status)}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="returns-from">Створено від</label><input id="returns-from" name="createdFrom" type="datetime-local" defaultValue={toDateTimeLocal(query.createdFrom)} autoComplete="off" /></div>
        <div className={styles.field}><label htmlFor="returns-to">Створено до</label><input id="returns-to" name="createdTo" type="datetime-local" defaultValue={toDateTimeLocal(query.createdTo)} autoComplete="off" /></div>
        <div className={styles.filterActions}><Link href="/internal/returns">Скинути</Link><Button type="submit">Застосувати</Button></div>
      </form>
      {returns.data.data.length === 0 ? <div className={styles.state}>Запитів за цими фільтрами немає.</div> : (
        <div className={styles.tableWrapper}><table className={styles.table}><caption className="sr-only">Операційна черга повернень</caption><thead><tr><th scope="col">Запит</th><th scope="col">Товар</th><th scope="col">Статус</th><th scope="col">Причина</th><th scope="col">Кількість</th><th scope="col">Створено</th><th scope="col">Дія</th></tr></thead><tbody>{returns.data.data.map((item) => <tr key={item.id}><td data-label="Запит"><span className={styles.identifier} translate="no">{item.id}</span></td><td data-label="Товар">{item.productName ?? "Збережені дані товару"}<span className={styles.meta} translate="no">{item.sku ?? "SKU недоступний"}</span></td><td data-label="Статус"><ReturnStatusBadge status={item.status} /></td><td data-label="Причина" className={styles.reasonCell}>{item.reason}</td><td data-label="Кількість" className={styles.numericValue}>{item.quantity}</td><td data-label="Створено"><time dateTime={item.createdAt}>{formatInternalDate(item.createdAt)}</time></td><td data-label="Дія"><Link className={styles.rowAction} href={`/internal/returns/${item.id}`}>Деталі</Link></td></tr>)}</tbody></table></div>
      )}
      {returns.data.pageInfo.nextCursor ? <div className={styles.pagination}><Link href={internalCursorHref("/internal/returns", query, returns.data.pageInfo.nextCursor, "limit")}>Наступна сторінка</Link></div> : null}
    </section>
  );
}
