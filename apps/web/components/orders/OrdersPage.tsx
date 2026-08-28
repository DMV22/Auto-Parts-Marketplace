"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { presentOrderError } from "@/lib/commerce/order-presentation";
import { orderHistoryQueryOptions } from "@/lib/query/commerce-queries";
import { OrderHistoryList } from "./OrderHistoryList";
import { OrdersAccessBoundary } from "./OrdersAccessBoundary";
import styles from "./orders.module.css";

export function OrdersPage() {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Історія покупок</p>
        <h1>Ваші замовлення</h1>
        <p>
          Історія належить поточному Customer або Guest context і не
          зберігається у browser storage.
        </p>
      </header>
      <OrdersAccessBoundary>
        <OrderHistory />
      </OrdersAccessBoundary>
    </main>
  );
}

function OrderHistory() {
  const router = useRouter();
  const searchParameters = useSearchParams();
  const cursor = searchParameters.get("cursor");
  const orders = useQuery(orderHistoryQueryOptions(cursor));

  if (orders.isPending) {
    return <p role="status">Завантажуємо історію замовлень…</p>;
  }

  if (orders.isError || !orders.data) {
    const failure = presentOrderError(orders.error);
    return (
      <section className={styles.state} aria-labelledby="orders-error-title">
        <h2 id="orders-error-title">{failure.title}</h2>
        <p role="alert">{failure.message}</p>
        <div className={styles.actions}>
          {failure.retryable ? (
            <Button type="button" variant="outline" onClick={() => void orders.refetch()}>
              Повторити запит
            </Button>
          ) : null}
          {cursor ? <Link href="/orders">Повернутися до початку</Link> : null}
        </div>
      </section>
    );
  }

  if (orders.data.data.length === 0) {
    return (
      <section className={styles.state} aria-labelledby="orders-empty-title">
        <h2 id="orders-empty-title">Замовлень поки немає</h2>
        <p>Після checkout створене замовлення з’явиться в цьому списку.</p>
        <Link href="/catalog">Перейти до каталогу</Link>
      </section>
    );
  }

  function openNextPage() {
    const nextCursor = orders.data?.pageInfo.nextCursor;
    if (!nextCursor) return;
    const parameters = new URLSearchParams({ cursor: nextCursor });
    router.push(`/orders?${parameters.toString()}`);
  }

  return (
    <section className={styles.workspace} aria-labelledby="orders-list-title">
      <div className={styles.sectionHeading}>
        <h2 id="orders-list-title">Історія</h2>
        {cursor ? <Link href="/orders">До першої сторінки</Link> : null}
      </div>
      <OrderHistoryList orders={orders.data.data} />
      {orders.data.pageInfo.hasNextPage ? (
        <Button type="button" variant="outline" onClick={openNextPage}>
          Наступна сторінка
        </Button>
      ) : null}
    </section>
  );
}
