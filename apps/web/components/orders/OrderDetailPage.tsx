"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import {
  formatOrderDate,
  presentOrderError,
} from "@/lib/commerce/order-presentation";
import {
  orderDetailQueryOptions,
  orderTimelineQueryOptions,
} from "@/lib/query/commerce-queries";
import { OrderItemSnapshotCard } from "./OrderItemSnapshotCard";
import { OrdersAccessBoundary } from "./OrdersAccessBoundary";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import styles from "./orders.module.css";

export function OrderDetailPage({ orderId }: Readonly<{ orderId: string }>) {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Замовлення</p>
        <h1>Деталі замовлення</h1>
        <Link href="/orders">До історії замовлень</Link>
      </header>
      <OrdersAccessBoundary>
        <OrderDetailWorkspace orderId={orderId} />
      </OrdersAccessBoundary>
    </main>
  );
}

function OrderDetailWorkspace({ orderId }: Readonly<{ orderId: string }>) {
  const router = useRouter();
  const searchParameters = useSearchParams();
  const timelineCursor = searchParameters.get("timelineCursor");
  const order = useQuery(orderDetailQueryOptions(orderId));
  const timeline = useQuery(orderTimelineQueryOptions(orderId, timelineCursor));

  if (order.isPending) {
    return <p role="status">Завантажуємо замовлення…</p>;
  }

  if (order.isError || !order.data) {
    const failure = presentOrderError(order.error);
    return (
      <section className={styles.state} aria-labelledby="order-error-title">
        <h2 id="order-error-title">{failure.title}</h2>
        <p role="alert">{failure.message}</p>
        {failure.retryable ? (
          <Button type="button" variant="outline" onClick={() => void order.refetch()}>
            Повторити запит
          </Button>
        ) : null}
      </section>
    );
  }

  function openTimelinePage(cursor: string) {
    const parameters = new URLSearchParams(searchParameters.toString());
    parameters.set("timelineCursor", cursor);
    router.push(`/orders/${orderId}?${parameters.toString()}`);
  }

  return (
    <div className={styles.detailLayout}>
      <section className={styles.detailCard} aria-labelledby="order-summary-title">
        <div className={styles.orderCardHeading}>
          <div>
            <h2 id="order-summary-title">Замовлення {order.data.orderId}</h2>
            <p>{formatOrderDate(order.data.createdAt)}</p>
          </div>
          <OrderStatusBadge status={order.data.status} />
        </div>
        <p className={styles.orderTotal}>
          Разом: <strong>{formatMoney(order.data.totalAmount, order.data.currency)}</strong>
        </p>
      </section>

      <section className={styles.detailCard} aria-labelledby="order-items-title">
        <h2 id="order-items-title">Позиції замовлення</h2>
        <ul className={styles.itemList}>
          {order.data.items.map((item) => (
            <OrderItemSnapshotCard
              key={item.id}
              item={item}
              currency={order.data.currency}
            />
          ))}
        </ul>
      </section>

      <section className={styles.detailCard} aria-labelledby="order-timeline-title">
        <div className={styles.sectionHeading}>
          <h2 id="order-timeline-title">Історія статусів</h2>
          {timelineCursor ? (
            <Link href={`/orders/${orderId}`}>Останні події</Link>
          ) : null}
        </div>
        <OrderTimeline
          timeline={timeline.data}
          isPending={timeline.isPending}
          error={timeline.error}
          onRetry={() => void timeline.refetch()}
          onNextPage={openTimelinePage}
        />
      </section>
    </div>
  );
}
