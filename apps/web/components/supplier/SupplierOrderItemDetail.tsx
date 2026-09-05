"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import {
  formatOrderDate,
  presentOrderStatus,
} from "@/lib/commerce/order-presentation";
import { supplierOrderItemQueryOptions } from "@/lib/query/supplier-queries";
import styles from "./supplier.module.css";

export function SupplierOrderItemDetail({
  supplierId,
  orderItemId,
}: Readonly<{ supplierId: string; orderItemId: string }>) {
  const item = useQuery(supplierOrderItemQueryOptions(supplierId, orderItemId));

  if (item.isPending) return <p role="status">Завантажуємо позицію…</p>;
  if (item.isError) {
    return (
      <section className={styles.state}>
        <h2>Позиція недоступна</h2>
        <p>Її не знайдено або вона належить іншому постачальнику.</p>
        <Link href={`/supplier/${supplierId}/order-items`}>До списку</Link>
      </section>
    );
  }

  return (
    <section className={styles.workspace} aria-labelledby="supplier-item-title">
      <div className={styles.toolbar}>
        <div className={styles.heading}>
          <p>Позиція замовлення</p>
          <h2 id="supplier-item-title">
            {item.data.productName ?? "Товар із замовлення"}
          </h2>
        </div>
        <Link href={`/supplier/${supplierId}/order-items`}>До списку</Link>
      </div>
      <div className={styles.detail}>
        <dl className={styles.orderItemSummary}>
          <div>
            <dt>SKU</dt>
            <dd>{item.data.sku ?? "—"}</dd>
          </div>
          <div>
            <dt>MPN</dt>
            <dd>{item.data.manufacturerPartNumber ?? "—"}</dd>
          </div>
          <div>
            <dt>Стан</dt>
            <dd>{item.data.condition ?? "—"}</dd>
          </div>
          <div>
            <dt>Кількість</dt>
            <dd>{item.data.quantity}</dd>
          </div>
          <div>
            <dt>Ціна за одиницю</dt>
            <dd>{formatMoney(item.data.unitPrice, item.data.currency)}</dd>
          </div>
          <div>
            <dt>Сума</dt>
            <dd>{formatMoney(item.data.lineTotal, item.data.currency)}</dd>
          </div>
          <div>
            <dt>Статус замовлення</dt>
            <dd>{presentOrderStatus(item.data.orderStatus).label}</dd>
          </div>
          <div>
            <dt>Замовлено</dt>
            <dd>{formatOrderDate(item.data.orderedAt)}</dd>
          </div>
        </dl>
        <p className={styles.privacyNote}>
          Тут доступні лише дані цієї проданої позиції. Особисті та платіжні дані
          покупця не відображаються.
        </p>
      </div>
    </section>
  );
}
