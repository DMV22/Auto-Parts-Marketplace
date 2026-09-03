"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import {
  formatOrderDate,
  presentOrderStatus,
} from "@/lib/commerce/order-presentation";
import { supplierOrderItemsQueryOptions } from "@/lib/query/supplier-queries";
import type { SupplierOrderItemsQuery } from "@/lib/supplier/supplier-types";
import styles from "./supplier.module.css";

export function SupplierOrderItemsScreen({
  supplierId,
  query,
}: Readonly<{ supplierId: string; query: SupplierOrderItemsQuery }>) {
  const orderItems = useQuery(supplierOrderItemsQueryOptions(supplierId, query));

  if (orderItems.isPending) {
    return <p role="status">Завантажуємо позиції замовлень…</p>;
  }
  if (orderItems.isError) {
    return (
      <section className={styles.state}>
        <h2>Позиції замовлень недоступні</h2>
        <p>Перевірте доступ або повторіть запит.</p>
        <Button type="button" variant="outline" onClick={() => void orderItems.refetch()}>
          Спробувати ще раз
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.workspace} aria-labelledby="supplier-items-title">
      <header className={styles.heading}>
        <p>Продані позиції</p>
        <h2 id="supplier-items-title">Позиції замовлень</h2>
        <p>Історичні дані товарів, проданих цим постачальником.</p>
      </header>
      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="supplier-order-status">Статус замовлення</label>
          <select id="supplier-order-status" name="status" defaultValue={query.status ?? ""}>
            <option value="">Усі</option>
            <option value="PENDING_PAYMENT">Очікує оплати</option>
            <option value="PAID">Оплачено</option>
            <option value="PROCESSING">Опрацьовується</option>
            <option value="SHIPPED">Відправлено</option>
            <option value="DELIVERED">Доставлено</option>
            <option value="CANCELLED">Скасовано</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="created-from">Від</label>
          <input
            id="created-from"
            name="createdFrom"
            type="datetime-local"
            defaultValue={dateTimeLocalValue(query.createdFrom)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="created-to">До</label>
          <input
            id="created-to"
            name="createdTo"
            type="datetime-local"
            defaultValue={dateTimeLocalValue(query.createdTo)}
          />
        </div>
        <Button type="submit">Застосувати</Button>
      </form>

      {orderItems.data.data.length === 0 ? (
        <div className={styles.state}>Позицій за цими фільтрами немає.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className="sr-only">
              Позиції замовлень поточного постачальника
            </caption>
            <thead>
              <tr>
                <th scope="col">Товар</th>
                <th scope="col">Кількість</th>
                <th scope="col">Сума</th>
                <th scope="col">Статус</th>
                <th scope="col">Дата</th>
                <th scope="col">Дія</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.data.data.map((item) => (
                <tr key={item.id}>
                  <td data-label="Товар / SKU">
                    <strong>{item.productName ?? "Товар із замовлення"}</strong>
                    <span className={`${styles.meta} ${styles.identifier}`}>
                      {item.sku ?? "SKU недоступний"}
                    </span>
                  </td>
                  <td data-label="Кількість" className={styles.numericValue}>
                    {item.quantity}
                  </td>
                  <td data-label="Сума" className={styles.numericValue}>
                    {formatMoney(item.lineTotal, item.currency)}
                  </td>
                  <td data-label="Статус">
                    <OrderStatusBadge status={item.orderStatus} />
                  </td>
                  <td data-label="Замовлено">
                    <time dateTime={item.orderedAt}>
                      {formatOrderDate(item.orderedAt)}
                    </time>
                  </td>
                  <td data-label="Дія">
                    <Link
                      className={styles.rowAction}
                      href={`/supplier/${supplierId}/order-items/${item.id}`}
                    >
                      Деталі
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {orderItems.data.meta.nextCursor ? (
        <div className={styles.pagination}>
          <Link href={nextPageHref(supplierId, query, orderItems.data.meta.nextCursor)}>
            Наступна сторінка
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function OrderStatusBadge({
  status,
}: Readonly<{
  status:
    | "PENDING_PAYMENT"
    | "PAID"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
}>) {
  const presentation = presentOrderStatus(status);
  return (
    <span className={styles.orderStatus} data-tone={presentation.tone}>
      <span aria-hidden="true" />
      {presentation.label}
    </span>
  );
}

function nextPageHref(
  supplierId: string,
  query: SupplierOrderItemsQuery,
  cursor: string,
): string {
  const search = new URLSearchParams();
  if (query.status) search.set("status", query.status);
  if (query.createdFrom) search.set("createdFrom", query.createdFrom);
  if (query.createdTo) search.set("createdTo", query.createdTo);
  search.set("cursor", cursor);
  return `/supplier/${supplierId}/order-items?${search.toString()}`;
}

function dateTimeLocalValue(value: string | undefined): string {
  return value ? value.slice(0, 16) : "";
}
