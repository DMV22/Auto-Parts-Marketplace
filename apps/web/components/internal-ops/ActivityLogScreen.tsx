"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatInternalDate } from "@/lib/internal-ops/internal-ops-presentation";
import { localDateTimeToIso, toDateTimeLocal } from "@/lib/internal-ops/internal-ops-route-query";
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
        <h2 id="activity-title">ActivityLog</h2>
        <p>{isAdmin ? "Admin має global read-only audit." : "SupportManager читає audit лише в scope конкретного Order або ReturnRequest."}</p>
      </header>
      <form className={styles.filters} onSubmit={applyFilters}>
        <div className={styles.field}><label htmlFor="activity-resource-type">Resource type</label><select id="activity-resource-type" name="resourceType" defaultValue={query.resourceType ?? ""}><option value="">Усі</option>{resources.map((resource) => <option key={resource} value={resource}>{resource}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="activity-resource-id">Resource ID</label><input id="activity-resource-id" name="resourceId" defaultValue={query.resourceId ?? ""} autoComplete="off" spellCheck={false} /></div>
        {isAdmin ? <div className={styles.field}><label htmlFor="activity-actor-id">Actor ID</label><input id="activity-actor-id" name="actorId" defaultValue={query.actorId ?? ""} autoComplete="off" spellCheck={false} /></div> : null}
        <div className={styles.field}><label htmlFor="activity-action">Action</label><input id="activity-action" name="action" defaultValue={query.action ?? ""} placeholder="Наприклад, NOTE_CREATED…" autoComplete="off" spellCheck={false} /></div>
        <div className={styles.field}><label htmlFor="activity-from">Створено від</label><input id="activity-from" name="createdFrom" type="datetime-local" defaultValue={toDateTimeLocal(query.createdFrom)} autoComplete="off" /></div>
        <div className={styles.field}><label htmlFor="activity-to">Створено до</label><input id="activity-to" name="createdTo" type="datetime-local" defaultValue={toDateTimeLocal(query.createdTo)} autoComplete="off" /></div>
        <Button type="submit">Застосувати</Button>
      </form>
      {!isAdmin && !hasSupportScope ? <div className={styles.warning}>Оберіть ORDER або RETURN_REQUEST і введіть Resource ID.</div> : null}
      {activity.isPending && activity.fetchStatus !== "idle" ? <p role="status">Завантажуємо audit…</p> : null}
      {activity.isError ? <div className={styles.error} role="alert">ActivityLog недоступний. Перевірте scope та query values.</div> : null}
      {activity.data?.data.length === 0 ? <div className={styles.state}>Audit events за цими фільтрами відсутні.</div> : null}
      {activity.data?.data.length ? (
        <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th scope="col">Дата</th><th scope="col">Actor</th><th scope="col">Resource</th><th scope="col">Action</th><th scope="col">Transition</th><th scope="col">Reason / metadata</th></tr></thead><tbody>{activity.data.data.map((item) => <tr key={item.id}><td>{formatInternalDate(item.createdAt)}</td><td>{item.actorRole ?? "SYSTEM"}<br /><span className={styles.meta} translate="no">{item.actorUserId ?? "—"}</span></td><td>{item.resourceType}<br /><span className={styles.meta} translate="no">{item.resourceId}</span></td><td>{item.action}</td><td>{item.previousStatus ?? "—"} → {item.newStatus ?? "—"}</td><td>{item.reason ?? "—"}{item.metadata ? <ul className={styles.metadata}>{Object.entries(item.metadata).map(([key, value]) => <li key={key}>{key}: <span translate="no">{value}</span></li>)}</ul> : null}</td></tr>)}</tbody></table></div>
      ) : null}
      {activity.data?.pageInfo.nextCursor ? <div className={styles.pagination}><Link href={activityNextHref(query, activity.data.pageInfo.nextCursor)}>Наступна сторінка</Link></div> : null}
    </section>
  );
}

function activityNextHref(query: ActivityQuery, cursor: string) {
  const search = new URLSearchParams();
  Object.entries({ ...query, cursor, limit: undefined }).forEach(([key, value]) => { if (value !== undefined) search.set(key, String(value)); });
  return `/internal/activity?${search}`;
}
