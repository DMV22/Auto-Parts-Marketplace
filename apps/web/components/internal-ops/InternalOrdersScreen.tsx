"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import {
  formatInternalDate,
  presentOrderStatus,
} from "@/lib/internal-ops/internal-ops-presentation";
import {
  localDateTimeToIso,
  internalCursorHref,
  toDateTimeLocal,
} from "@/lib/internal-ops/internal-ops-route-query";
import type { InternalOrdersQuery } from "@/lib/internal-ops/internal-ops-types";
import { internalOrdersQueryOptions } from "@/lib/query/internal-ops-queries";
import { OrderStatusBadge } from "./InternalStatusBadge";
import styles from "./internal-ops.module.css";

export function InternalOrdersScreen({ query }: { query: InternalOrdersQuery }) {
  const orders = useQuery(internalOrdersQueryOptions(query));
  const router = useRouter();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const search = new URLSearchParams();
    setText(search, "status", form.get("status"));
    setText(search, "paymentOutcome", form.get("paymentOutcome"));
    setOptional(search, "createdFrom", localDateTimeToIso(form.get("createdFrom")));
    setOptional(search, "createdTo", localDateTimeToIso(form.get("createdTo")));
    router.push(`/internal/orders${search.size ? `?${search}` : ""}`);
  }

  if (orders.isPending) {
    return (
      <section className={styles.state}>
        <h2>Черга замовлень</h2>
        <p role="status">Завантажуємо операційні дані…</p>
      </section>
    );
  }
  if (orders.isError) {
    return (
      <section className={styles.state}>
        <h2>Черга замовлень недоступна</h2>
        <p>Перевірте доступ або повторіть запит.</p>
        <Button type="button" variant="outline" onClick={() => void orders.refetch()}>
          Спробувати ще раз
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.workspace} aria-labelledby="internal-orders-title">
      <header className={styles.heading}>
        <p>Операційні дані</p>
        <h2 id="internal-orders-title">Черга замовлень</h2>
        <p>Переглядайте стан виконання. Результат оплати доступний лише для читання.</p>
      </header>
      <form className={styles.filters} onSubmit={applyFilters}>
        <div className={styles.field}>
          <label htmlFor="internal-order-status">Статус</label>
          <select id="internal-order-status" name="status" defaultValue={query.status ?? ""}>
            <option value="">Усі</option>
            {[
              "PENDING_PAYMENT",
              "PAID",
              "PROCESSING",
              "SHIPPED",
              "DELIVERED",
              "CANCELLED",
            ].map((status) => (
              <option key={status} value={status}>
                {presentOrderStatus(status as NonNullable<InternalOrdersQuery["status"]>)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="payment-outcome">Результат оплати</label>
          <select id="payment-outcome" name="paymentOutcome" defaultValue={query.paymentOutcome ?? ""}>
            <option value="">Усі</option>
            <option value="PENDING">Очікується</option>
            <option value="PAID">Оплачено</option>
            <option value="FAILED_OR_EXPIRED">Не вдалося або прострочено</option>
            <option value="NOT_APPLICABLE">Не застосовується</option>
          </select>
        </div>
        <DateField id="orders-from" name="createdFrom" label="Створено від" value={query.createdFrom} />
        <DateField id="orders-to" name="createdTo" label="Створено до" value={query.createdTo} />
        <div className={styles.filterActions}>
          <Link href="/internal/orders">Скинути</Link>
          <Button type="submit">Застосувати</Button>
        </div>
      </form>

      {orders.data.data.length === 0 ? (
        <div className={styles.state}>Замовлень за цими фільтрами немає.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className="sr-only">Internal OMS — черга замовлень</caption>
            <thead>
              <tr>
                <th scope="col">Замовлення</th>
                <th scope="col">Статус</th>
                <th scope="col">Клієнт</th>
                <th scope="col">Оплата</th>
                <th scope="col">Сума</th>
                <th scope="col">Позиції</th>
                <th scope="col">Дата</th>
                <th scope="col">Дія</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.data.map((order) => (
                <tr key={order.orderId}>
                  <td data-label="Замовлення"><span className={styles.identifier} translate="no">{order.orderId}</span></td>
                  <td data-label="Статус"><OrderStatusBadge status={order.status} /></td>
                  <td data-label="Клієнт">{order.customerName ?? (order.customerType === "GUEST" ? "Гість" : "Без імені")}<span className={styles.meta}>{order.customerType === "GUEST" ? "Гостьове замовлення" : "Клієнт"}</span></td>
                  <td data-label="Оплата"><PaymentOutcome value={order.paymentOutcome} /></td>
                  <td data-label="Сума" className={styles.numericValue}>{formatMoney(order.totalAmount, order.currency)}</td>
                  <td data-label="Позиції" className={styles.numericValue}>{order.itemCount}</td>
                  <td data-label="Дата"><time dateTime={order.createdAt}>{formatInternalDate(order.createdAt)}</time></td>
                  <td data-label="Дія"><Link className={styles.rowAction} href={`/internal/orders/${order.orderId}`}>Деталі</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {orders.data.pageInfo.nextCursor ? (
        <div className={styles.pagination}>
          <Link href={internalCursorHref("/internal/orders", query, orders.data.pageInfo.nextCursor, "limit")}>Наступна сторінка</Link>
        </div>
      ) : null}
    </section>
  );
}

function PaymentOutcome({
  value,
}: Readonly<{ value: "PENDING" | "PAID" | "FAILED_OR_EXPIRED" | "NOT_APPLICABLE" }>) {
  const presentation = {
    PENDING: { label: "Очікується", tone: "warning" },
    PAID: { label: "Оплачено", tone: "positive" },
    FAILED_OR_EXPIRED: { label: "Не підтверджено", tone: "negative" },
    NOT_APPLICABLE: { label: "Не застосовується", tone: "neutral" },
  }[value];
  return <span className={styles.paymentOutcome} data-tone={presentation.tone}>{presentation.label}</span>;
}

function DateField({ id, name, label, value }: { id: string; name: string; label: string; value?: string }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type="datetime-local" defaultValue={toDateTimeLocal(value)} autoComplete="off" />
    </div>
  );
}

function setText(search: URLSearchParams, key: string, value: FormDataEntryValue | null) {
  if (typeof value === "string" && value) search.set(key, value);
}

function setOptional(search: URLSearchParams, key: string, value: string | undefined) {
  if (value) search.set(key, value);
}
