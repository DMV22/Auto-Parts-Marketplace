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

  if (order.isPending || timeline.isPending) return <p role="status">Завантажуємо internal Order…</p>;
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
          <h2 id="internal-order-title">Замовлення <span translate="no">{orderId}</span></h2>
          <OrderStatusBadge status={order.data.status} />
        </div>
        <Link href="/internal/orders">До черги</Link>
      </div>
      <div className={styles.panel}>
        <dl className={styles.summary}>
          <div><dt>Payment outcome</dt><dd>{order.data.paymentOutcome}</dd></div>
          <div><dt>Сума</dt><dd>{formatMoney(order.data.totalAmount, order.data.currency)}</dd></div>
          <div><dt>Створено</dt><dd>{formatInternalDate(order.data.createdAt)}</dd></div>
          <div><dt>Клієнт</dt><dd>{order.data.customer.type === "GUEST" ? "Guest" : order.data.customer.name}</dd></div>
          <div><dt>Email</dt><dd>{order.data.customer.type === "GUEST" ? "Не розкривається" : order.data.customer.email}</dd></div>
        </dl>
        <p className={styles.warning}>Payment status не редагується в OMS: authority залишається у verified Stripe webhook.</p>
      </div>
      <div className={styles.panel}>
        <h3>Позиції</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className="sr-only">Позиції internal замовлення</caption>
            <thead><tr><th scope="col">Товар</th><th scope="col">Supplier</th><th scope="col">Кількість</th><th scope="col">Сума</th></tr></thead>
            <tbody>
              {order.data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productName ?? "Snapshot товару"}<br /><span className={styles.meta}>{item.sku ?? "SKU недоступний"}</span></td>
                  <td>{item.supplierName ?? "Постачальник недоступний"}</td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.lineTotal, order.data.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.panel}>
        <h3>Operational transition</h3>
        {nextStatus ? (
          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="order-transition-reason">Причина (необов’язково)</label>
              <textarea id="order-transition-reason" value={reason} maxLength={500} autoComplete="off" onChange={(event) => setReason(event.target.value)} />
            </div>
            <Button type="button" disabled={transition.isPending} onClick={() => transition.mutate({ target: nextStatus })}>
              {transition.isPending ? "Оновлюємо…" : `Перевести в «${presentOrderStatus(nextStatus)}»`}
            </Button>
          </div>
        ) : <p>Для поточного статусу operational transition недоступний.</p>}
        {transition.error ? <p className={styles.error} role="alert">{internalMutationError(transition.error)}</p> : null}
        {transition.isSuccess ? <p className={styles.success} aria-live="polite">Статус підтверджено backend response.</p> : null}
      </div>
      <div className={styles.panel}>
        <h3>Timeline</h3>
        <ol className={styles.list}>
          {timeline.data.data.map((event) => (
            <li key={event.id}>{formatInternalDate(event.occurredAt)} — {presentOrderStatus(event.status)} ({event.reasonCode})</li>
          ))}
        </ol>
        {timeline.data.pageInfo.nextCursor ? (
          <Link href={`/internal/orders/${orderId}?timelineCursor=${encodeURIComponent(timeline.data.pageInfo.nextCursor)}`}>Наступні події</Link>
        ) : null}
      </div>
      <InternalNotesPanel target={{ type: "ORDER", id: orderId }} />
    </section>
  );
}
