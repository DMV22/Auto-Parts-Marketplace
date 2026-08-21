"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import {
  presentCheckoutError,
  presentCheckoutStatus,
  type CheckoutReturnMode,
} from "@/lib/commerce/checkout-presentation";
import { orderDetailQueryOptions } from "@/lib/query/commerce-queries";
import styles from "./CheckoutStatus.module.css";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;

export function CheckoutStatus({
  orderId,
  mode,
}: Readonly<{ orderId: string; mode: CheckoutReturnMode }>) {
  const [timedOut, setTimedOut] = useState(false);
  const order = useQuery({
    ...orderDetailQueryOptions(orderId),
    refetchInterval: (query) =>
      !timedOut && query.state.data?.status === "PENDING_PAYMENT"
        ? POLL_INTERVAL_MS
        : false,
  });
  const status = order.data?.status;

  useEffect(() => {
    if (status !== "PENDING_PAYMENT" || timedOut) return;

    const timeout = window.setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [orderId, status, timedOut]);

  if (order.isPending) {
    return <p role="status">Отримуємо актуальний статус замовлення…</p>;
  }

  if (order.isError || !order.data) {
    return (
      <section className={styles.state} aria-labelledby="checkout-error-title">
        <h2 id="checkout-error-title">Не вдалося перевірити замовлення</h2>
        <p role="alert">{presentCheckoutError(order.error)}</p>
        <Button type="button" variant="outline" onClick={() => void order.refetch()}>
          Повторити перевірку
        </Button>
      </section>
    );
  }

  const presentation = presentCheckoutStatus(order.data.status, timedOut, mode);

  function refreshStatus() {
    setTimedOut(false);
    void order.refetch();
  }

  return (
    <section
      className={styles.statusCard}
      data-tone={presentation.tone}
      aria-labelledby="checkout-status-title"
    >
      <div className={styles.statusCopy} aria-live="polite">
        <span>{order.data.status.replaceAll("_", " ")}</span>
        <h2 id="checkout-status-title">{presentation.title}</h2>
        <p>{presentation.message}</p>
      </div>

      <dl className={styles.summary}>
        <div>
          <dt>Номер замовлення</dt>
          <dd>{order.data.orderId}</dd>
        </div>
        <div>
          <dt>Сума</dt>
          <dd>{formatMoney(order.data.totalAmount, order.data.currency)}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        {(presentation.polling || timedOut) && (
          <Button type="button" variant="outline" onClick={refreshStatus}>
            Оновити статус
          </Button>
        )}
        <Link href={mode === "cancel" ? "/cart" : "/catalog"}>
          {mode === "cancel" ? "Повернутися до кошика" : "До каталогу"}
        </Link>
      </div>
    </section>
  );
}
