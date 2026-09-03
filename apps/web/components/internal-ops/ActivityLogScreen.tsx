"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatInternalDate } from "@/lib/internal-ops/internal-ops-presentation";
import { internalCursorHref, localDateTimeToIso, toDateTimeLocal } from "@/lib/internal-ops/internal-ops-route-query";
import type { ActivityQuery, ActivityResource } from "@/lib/internal-ops/internal-ops-types";
import { activityQueryOptions } from "@/lib/query/internal-ops-queries";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./internal-ops.module.css";

const resources: ActivityResource[] = ["ORDER", "RETURN_REQUEST", "LISTING", "NOTE"];

export function ActivityLogScreen({ query }: { query: ActivityQuery }) {
  const session = useQuery(sessionQueryOptions());
  const isAdmin = session.data?.user.role === "ADMIN";
  const hasSupportScope = Boolean(
    query.resourceId &&
    (query.resourceType === "ORDER" || query.resourceType === "RETURN_REQUEST"),
  );
  const activity = useQuery({
    ...activityQueryOptions(query),
    enabled: Boolean(isAdmin || hasSupportScope),
  });
  const router = useRouter();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const search = new URLSearchParams();
    for (const key of ["actorId", "action", "resourceType", "resourceId"] as const) {
      const value = form.get(key);
      if (typeof value === "string" && value) search.set(key, value);
    }
    const from = localDateTimeToIso(form.get("createdFrom"));
    const to = localDateTimeToIso(form.get("createdTo"));
    if (from) search.set("createdFrom", from);
    if (to) search.set("createdTo", to);
    router.push(`/internal/activity${search.size ? `?${search}` : ""}`);
  }

  return (
    <section className={styles.workspace} aria-labelledby="activity-title">
      <header className={styles.heading}>
        <p>Аудит</p>
        <h2 id="activity-title">Журнал дій</h2>
        <p>{isAdmin ? "Перегляд усіх дозволених подій без можливості редагування." : "Вкажіть конкретне замовлення або повернення для перегляду його історії."}</p>
      </header>
      <form className={styles.filters} onSubmit={applyFilters}>
        <div className={styles.field}><label htmlFor="activity-resource-type">Тип ресурсу</label><select id="activity-resource-type" name="resourceType" defaultValue={query.resourceType ?? ""}><option value="">Усі</option>{resources.map((resource) => <option key={resource} value={resource}>{resourceLabel(resource)}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="activity-resource-id">ID ресурсу</label><input id="activity-resource-id" name="resourceId" defaultValue={query.resourceId ?? ""} placeholder="UUID ресурсу…" autoComplete="off" spellCheck={false} /></div>
        {isAdmin ? <div className={styles.field}><label htmlFor="activity-actor-id">ID виконавця</label><input id="activity-actor-id" name="actorId" defaultValue={query.actorId ?? ""} placeholder="UUID користувача…" autoComplete="off" spellCheck={false} /></div> : null}
        <div className={styles.field}><label htmlFor="activity-action">Дія</label><input id="activity-action" name="action" defaultValue={query.action ?? ""} placeholder="Наприклад, NOTE_CREATED…" autoComplete="off" spellCheck={false} /></div>
        <div className={styles.field}><label htmlFor="activity-from">Створено від</label><input id="activity-from" name="createdFrom" type="datetime-local" defaultValue={toDateTimeLocal(query.createdFrom)} autoComplete="off" /></div>
        <div className={styles.field}><label htmlFor="activity-to">Створено до</label><input id="activity-to" name="createdTo" type="datetime-local" defaultValue={toDateTimeLocal(query.createdTo)} autoComplete="off" /></div>
        <div className={styles.filterActions}><Link href="/internal/activity">Скинути</Link><Button type="submit">Застосувати</Button></div>
      </form>
      {!isAdmin && !hasSupportScope ? <div className={styles.warning}>Оберіть замовлення або повернення та введіть ID ресурсу.</div> : null}
      {activity.isPending && activity.fetchStatus !== "idle" ? <p role="status">Завантажуємо журнал…</p> : null}
      {activity.isError ? <div className={styles.error} role="alert">Журнал недоступний. Перевірте область пошуку та значення фільтрів.</div> : null}
      {activity.data?.data.length === 0 ? <div className={styles.state}>Подій за цими фільтрами немає.</div> : null}
      {activity.data?.data.length ? (
        <div className={styles.tableWrapper}><table className={styles.table}><caption className="sr-only">Події внутрішнього журналу дій</caption><thead><tr><th scope="col">Дата</th><th scope="col">Виконавець</th><th scope="col">Ресурс</th><th scope="col">Дія</th><th scope="col">Перехід</th><th scope="col">Причина / metadata</th></tr></thead><tbody>{activity.data.data.map((item) => <tr key={item.id}><td data-label="Дата"><time dateTime={item.createdAt}>{formatInternalDate(item.createdAt)}</time></td><td data-label="Виконавець"><code>{item.actorRole ?? "SYSTEM"}</code><span className={styles.meta} translate="no">{item.actorUserId ?? "—"}</span></td><td data-label="Ресурс"><code>{item.resourceType}</code><span className={styles.meta} translate="no">{item.resourceId}</span></td><td data-label="Дія"><code>{item.action}</code></td><td data-label="Перехід"><span className={styles.transitionValue}>{item.previousStatus ?? "—"} <span aria-hidden="true">→</span> {item.newStatus ?? "—"}</span></td><td data-label="Причина / metadata">{item.reason ?? "—"}{item.metadata ? <ul className={styles.metadata}>{Object.entries(item.metadata).map(([key, value]) => <li key={key}>{key}: <span translate="no">{value}</span></li>)}</ul> : null}</td></tr>)}</tbody></table></div>
      ) : null}
      {activity.data?.pageInfo.nextCursor ? <div className={styles.pagination}><Link href={internalCursorHref("/internal/activity", query, activity.data.pageInfo.nextCursor, "limit")}>Наступна сторінка</Link></div> : null}
    </section>
  );
}

function resourceLabel(resource: ActivityResource): string {
  return {
    ORDER: "Замовлення",
    RETURN_REQUEST: "Повернення",
    LISTING: "Оголошення",
    NOTE: "Нотатка",
  }[resource];
}
