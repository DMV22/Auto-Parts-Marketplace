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

  if (orders.isPending) return <p role="status">Завантажуємо чергу замовлень…</p>;
  if (orders.isError) {
    return (
      <section className={styles.state}>
        <h2>Черга замовлень недоступна</h2>
        <p>Перевірте session/role або повторіть запит.</p>
        <Button type="button" variant="outline" onClick={() => void orders.refetch()}>
          Спробувати ще раз
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.workspace} aria-labelledby="internal-orders-title">
      <header className={styles.heading}>
        <h2 id="internal-orders-title">Черга замовлень</h2>
        <p>Payment outcome доступний лише для читання; payment state змінює Stripe webhook.</p>
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
          <label htmlFor="payment-outcome">Payment outcome</label>
          <select id="payment-outcome" name="paymentOutcome" defaultValue={query.paymentOutcome ?? ""}>
            <option value="">Усі</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED_OR_EXPIRED">Failed / expired</option>
            <option value="NOT_APPLICABLE">Not applicable</option>
          </select>
        </div>
        <DateField id="orders-from" name="createdFrom" label="Створено від" value={query.createdFrom} />
        <DateField id="orders-to" name="createdTo" label="Створено до" value={query.createdTo} />
        <Button type="submit">Застосувати</Button>
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
                <th scope="col">Payment</th>
                <th scope="col">Сума</th>
                <th scope="col">Дата</th>
                <th scope="col">Дія</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.data.map((order) => (
                <tr key={order.orderId}>
                  <td translate="no">{order.orderId}</td>
                  <td><OrderStatusBadge status={order.status} /></td>
                  <td>{order.customerName ?? (order.customerType === "GUEST" ? "Guest" : "Без імені")}</td>
                  <td>{order.paymentOutcome}</td>
                  <td>{formatMoney(order.totalAmount, order.currency)}</td>
                  <td>{formatInternalDate(order.createdAt)}</td>
                  <td><Link href={`/internal/orders/${order.orderId}`}>Деталі</Link></td>
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
