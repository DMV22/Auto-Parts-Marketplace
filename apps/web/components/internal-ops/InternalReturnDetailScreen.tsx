"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { transitionInternalReturn } from "@/lib/internal-ops/internal-ops-api";
import {
  formatInternalDate,
  internalMutationError,
  nextReturnStatuses,
  presentReturnStatus,
} from "@/lib/internal-ops/internal-ops-presentation";
import type { ReturnRequestStatus } from "@/lib/internal-ops/internal-ops-types";
import { internalReturnQueryOptions } from "@/lib/query/internal-ops-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { InternalNotesPanel } from "./InternalNotesPanel";
import { ReturnStatusBadge } from "./InternalStatusBadge";
import styles from "./internal-ops.module.css";

export function InternalReturnDetailScreen({ returnRequestId }: { returnRequestId: string }) {
  const request = useQuery(internalReturnQueryOptions(returnRequestId));
  const queryClient = useQueryClient();
  const [targetStatus, setTargetStatus] = useState<ReturnRequestStatus | "">("");
  const [reason, setReason] = useState("");
  const transition = useMutation({
    mutationFn: () => transitionInternalReturn(returnRequestId, targetStatus as ReturnRequestStatus, reason.trim() || null),
    onSuccess: async () => {
      setTargetStatus("");
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.return(returnRequestId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.returnsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.activityRoot }),
      ]);
    },
  });
  if (request.isPending) return <p role="status">Завантажуємо ReturnRequest…</p>;
  if (request.isError) return <section className={styles.state}><h2>ReturnRequest недоступний</h2><p>Його не знайдено або він недоступний поточній ролі.</p><Link href="/internal/returns">До черги</Link></section>;
  const targets = nextReturnStatuses(request.data.status);
  return (
    <section className={styles.workspace} aria-labelledby="return-detail-title">
      <div className={styles.toolbar}><div className={styles.heading}><h2 id="return-detail-title">ReturnRequest <span translate="no">{returnRequestId}</span></h2><ReturnStatusBadge status={request.data.status} /></div><Link href="/internal/returns">До черги</Link></div>
      <div className={styles.panel}>
        <dl className={styles.summary}>
          <div><dt>Order</dt><dd translate="no">{request.data.orderId}</dd></div>
          <div><dt>OrderItem</dt><dd translate="no">{request.data.orderItemId}</dd></div>
          <div><dt>Створено</dt><dd>{formatInternalDate(request.data.createdAt)}</dd></div>
          <div><dt>Клієнт</dt><dd>{request.data.customer.type === "GUEST" ? "Guest" : request.data.customer.name}</dd></div>
          <div><dt>Email</dt><dd>{request.data.customer.type === "GUEST" ? "Не розкривається" : request.data.customer.email}</dd></div>
        </dl>
        <p><strong>Причина:</strong> {request.data.reason}</p>
        {request.data.decisionReason ? <p><strong>Decision reason:</strong> {request.data.decisionReason}</p> : null}
      </div>
      <div className={styles.panel}>
        <h3>Return transition</h3>
        {targets.length ? (
          <div className={styles.form}>
            <div className={styles.field}><label htmlFor="return-target-status">Наступний статус</label><select id="return-target-status" value={targetStatus} onChange={(event) => setTargetStatus(event.target.value as ReturnRequestStatus | "")}><option value="">Оберіть дію</option>{targets.map((status) => <option key={status} value={status}>{presentReturnStatus(status)}</option>)}</select></div>
            <div className={styles.field}><label htmlFor="return-transition-reason">Причина (необов’язково)</label><textarea id="return-transition-reason" value={reason} maxLength={500} autoComplete="off" onChange={(event) => setReason(event.target.value)} /></div>
            <Button type="button" disabled={!targetStatus || transition.isPending} onClick={() => transition.mutate()}>{transition.isPending ? "Оновлюємо…" : "Підтвердити transition"}</Button>
          </div>
        ) : <p>ReturnRequest перебуває у terminal state.</p>}
        {transition.error ? <p className={styles.error} role="alert">{internalMutationError(transition.error)}</p> : null}
        {transition.isSuccess ? <p className={styles.success} aria-live="polite">Transition підтверджено backend response.</p> : null}
      </div>
      <InternalNotesPanel target={{ type: "RETURN_REQUEST", id: returnRequestId }} />
    </section>
  );
}
