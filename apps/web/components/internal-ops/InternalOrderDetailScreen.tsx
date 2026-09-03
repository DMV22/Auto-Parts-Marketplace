"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import { transitionInternalOrder } from "@/lib/internal-ops/internal-ops-api";
import {
  formatInternalDate,
  internalMutationError,
  nextOrderStatus,
  presentOrderStatus,
} from "@/lib/internal-ops/internal-ops-presentation";
import {
  internalOrderQueryOptions,
  internalOrderTimelineQueryOptions,
} from "@/lib/query/internal-ops-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { InternalNotesPanel } from "./InternalNotesPanel";
import { OrderStatusBadge } from "./InternalStatusBadge";
import styles from "./internal-ops.module.css";

export function InternalOrderDetailScreen({
  orderId,
  timelineCursor,
}: {
  orderId: string;
  timelineCursor: string | null;
}) {
  const order = useQuery(internalOrderQueryOptions(orderId));
  const timeline = useQuery(internalOrderTimelineQueryOptions(orderId, timelineCursor));
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const transition = useMutation({
    mutationFn: ({ target }: { target: NonNullable<ReturnType<typeof nextOrderStatus>> }) =>
      transitionInternalOrder(orderId, target, reason.trim() || null),
    onSuccess: async () => {
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.order(orderId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.ordersRoot }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.internalOps.orderTimelineRoot(orderId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.internalOps.activityRoot }),
      ]);
    },
  });

  if (order.isPending || timeline.isPending) {
    return <section className={styles.state}><h2>Замовлення</h2><p role="status">Завантажуємо деталі та історію…</p></section>;
  }
  if (order.isError || timeline.isError) {
    return (
      <section className={styles.state}>
        <h2>Замовлення недоступне</h2>
        <p>Його не знайдено або воно недоступне поточній ролі.</p>
        <Link href="/internal/orders">До черги</Link>
      </section>
    );
  }

  const nextStatus = nextOrderStatus(order.data.status);
  return (
    <section className={styles.workspace} aria-labelledby="internal-order-title">
      <div className={styles.toolbar}>
        <div className={styles.heading}>
          <p>Замовлення</p>
          <h2 id="internal-order-title"><span translate="no">{orderId}</span></h2>
          <div className={styles.statusRow}><OrderStatusBadge status={order.data.status} /><span className={styles.meta}>Оновлено {formatInternalDate(order.data.updatedAt)}</span></div>
        </div>
        <Link href="/internal/orders">До черги</Link>
      </div>
      <div className={styles.detailLayout}>
        <div className={styles.detailMain}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Зведення</span><h3>Дані замовлення</h3></div><strong className={styles.totalValue}>{formatMoney(order.data.totalAmount, order.data.currency)}</strong></div>
            <dl className={styles.summary}>
              <div><dt>Результат оплати</dt><dd>{order.data.paymentOutcome}</dd></div>
              <div><dt>Створено</dt><dd><time dateTime={order.data.createdAt}>{formatInternalDate(order.data.createdAt)}</time></dd></div>
              <div><dt>Клієнт</dt><dd>{order.data.customer.type === "GUEST" ? "Гість" : order.data.customer.name}</dd></div>
              <div><dt>Email</dt><dd>{order.data.customer.type === "GUEST" ? "Не розкривається" : order.data.customer.email}</dd></div>
              <div><dt>Кількість позицій</dt><dd>{order.data.items.length}</dd></div>
            </dl>
            <p className={styles.infoNotice}>Результат оплати змінюється лише після перевіреної відповіді платіжної системи.</p>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Незмінний знімок</span><h3>Позиції замовлення</h3></div></div>
            <div
              className={styles.tableWrapper}
              tabIndex={0}
              aria-label="Прокручувана таблиця позицій замовлення"
            >
              <table className={styles.table}>
                <caption className="sr-only">Позиції операційного замовлення</caption>
                <thead><tr><th scope="col">Товар</th><th scope="col">Постачальник</th><th scope="col">Стан</th><th scope="col">Кількість</th><th scope="col">Ціна</th><th scope="col">Сума</th></tr></thead>
                <tbody>{order.data.items.map((item) => <tr key={item.id}>
                  <td data-label="Товар">{item.productName ?? "Збережені дані товару"}<span className={styles.meta} translate="no">{item.sku ?? "SKU недоступний"} · {item.manufacturerPartNumber ?? "MPN недоступний"}</span></td>
                  <td data-label="Постачальник">{item.supplierName ?? "Недоступний"}</td>
                  <td data-label="Стан">{item.condition ?? "Не вказано"}</td>
                  <td data-label="Кількість" className={styles.numericValue}>{item.quantity}</td>
                  <td data-label="Ціна" className={styles.numericValue}>{formatMoney(item.unitPrice, order.data.currency)}</td>
                  <td data-label="Сума" className={styles.numericValue}>{formatMoney(item.lineTotal, order.data.currency)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Історія</span><h3>Статуси замовлення</h3></div></div>
            <ol className={styles.timeline}>
              {timeline.data.data.map((event) => <li key={event.id}><span className={styles.timelineMarker} aria-hidden="true" /><div><strong>{presentOrderStatus(event.status)}</strong><span>{formatInternalDate(event.occurredAt)}</span><code>{event.reasonCode}</code></div></li>)}
            </ol>
            {timeline.data.pageInfo.nextCursor ? <Link className={styles.rowAction} href={`/internal/orders/${orderId}?timelineCursor=${encodeURIComponent(timeline.data.pageInfo.nextCursor)}`}>Наступні події</Link> : null}
          </section>
        </div>

        <aside className={styles.actionRail} aria-label="Дії та внутрішні нотатки">
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Контрольований перехід</span><h3>Наступна дія</h3></div></div>
            {nextStatus ? <div className={styles.form}><p>Доступний перехід: <strong>{presentOrderStatus(nextStatus)}</strong></p><div className={styles.field}><label htmlFor="order-transition-reason">Причина (необов’язково)</label><textarea id="order-transition-reason" value={reason} maxLength={500} autoComplete="off" onChange={(event) => setReason(event.target.value)} /></div><Button type="button" disabled={transition.isPending} onClick={() => transition.mutate({ target: nextStatus })}>{transition.isPending ? "Оновлюємо…" : `Перевести в «${presentOrderStatus(nextStatus)}»`}</Button></div> : <p>Для поточного статусу наступна операційна дія недоступна.</p>}
            {transition.error ? <p className={styles.error} role="alert">{internalMutationError(transition.error)}</p> : null}
            {transition.isSuccess ? <p className={styles.success} aria-live="polite">Статус замовлення оновлено.</p> : null}
          </section>
          <InternalNotesPanel target={{ type: "ORDER", id: orderId }} />
        </aside>
      </div>
    </section>
  );
}
