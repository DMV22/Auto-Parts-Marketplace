"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { transitionInternalReturn } from "@/lib/internal-ops/internal-ops-api";
import {
  canSubmitReturnTransition,
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
  if (request.isPending) return <section className={styles.state}><h2>Запит на повернення</h2><p role="status">Завантажуємо деталі…</p></section>;
  if (request.isError) return <section className={styles.state}><h2>Запит недоступний</h2><p>Його не знайдено або він недоступний поточній ролі.</p><Link className={styles.backLink} href="/internal/returns"><ArrowLeft aria-hidden="true" />Повернутися до черги повернень</Link></section>;
  const targets = nextReturnStatuses(request.data.status);
  const rejectionReasonRequired = targetStatus === "REJECTED";
  return (
    <section className={styles.workspace} aria-labelledby="return-detail-title">
      <div className={styles.toolbar}><div className={styles.heading}><p>Повернення</p><h2 id="return-detail-title"><span translate="no">{returnRequestId}</span></h2><ReturnStatusBadge status={request.data.status} /></div><Link className={styles.backLink} href="/internal/returns"><ArrowLeft aria-hidden="true" />Повернутися до черги повернень</Link></div>
      <div className={styles.detailLayout}>
        <div className={styles.detailMain}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Зведення</span><h3>Дані запиту</h3></div></div>
            <dl className={styles.summary}>
              <div><dt>Замовлення</dt><dd translate="no">{request.data.orderId}</dd></div>
              <div><dt>Позиція замовлення</dt><dd translate="no">{request.data.orderItemId}</dd></div>
              <div><dt>Створено</dt><dd><time dateTime={request.data.createdAt}>{formatInternalDate(request.data.createdAt)}</time></dd></div>
              <div><dt>Клієнт</dt><dd>{request.data.customer.type === "GUEST" ? "Гість" : request.data.customer.name}</dd></div>
              <div><dt>Email</dt><dd>{request.data.customer.type === "GUEST" ? "Не розкривається" : request.data.customer.email}</dd></div>
              <div><dt>Кількість</dt><dd>{request.data.quantity}</dd></div>
            </dl>
            <div className={styles.reasonBlock}><div><span>Причина запиту</span><p>{request.data.reason}</p></div>{request.data.decisionReason ? <div><span>Причина рішення</span><p>{request.data.decisionReason}</p></div> : null}</div>
          </section>
        </div>
        <aside className={styles.actionRail} aria-label="Дії та внутрішні нотатки">
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Контрольований перехід</span><h3>Наступний статус</h3></div></div>
            {targets.length ? <div className={styles.form}><div className={styles.field}><label htmlFor="return-target-status">Оберіть статус</label><select id="return-target-status" value={targetStatus} onChange={(event) => setTargetStatus(event.target.value as ReturnRequestStatus | "")}><option value="">Оберіть дію</option>{targets.map((status) => <option key={status} value={status}>{presentReturnStatus(status)}</option>)}</select></div><div className={styles.field}><label htmlFor="return-transition-reason">Причина {rejectionReasonRequired ? "(обов’язково для відхилення)" : "(необов’язково)"}</label><textarea id="return-transition-reason" value={reason} maxLength={500} required={rejectionReasonRequired} autoComplete="off" onChange={(event) => setReason(event.target.value)} /></div><Button type="button" disabled={!canSubmitReturnTransition(targetStatus, reason) || transition.isPending} onClick={() => transition.mutate()}>{transition.isPending ? "Оновлюємо…" : "Підтвердити перехід"}</Button></div> : <p>Запит перебуває у завершальному статусі.</p>}
            {transition.error ? <p className={styles.error} role="alert">{internalMutationError(transition.error)}</p> : null}
            {transition.isSuccess ? <p className={styles.success} aria-live="polite">Статус повернення оновлено.</p> : null}
          </section>
          <InternalNotesPanel target={{ type: "RETURN_REQUEST", id: returnRequestId }} />
        </aside>
      </div>
    </section>
  );
}
