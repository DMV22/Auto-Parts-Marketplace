import Link from "next/link";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import type { OrderHistoryItem } from "@/lib/commerce/order-types";
import { formatOrderDate } from "@/lib/commerce/order-presentation";
import { OrderStatusBadge } from "./OrderStatusBadge";
import styles from "./orders.module.css";

export function OrderHistoryList({
  orders,
}: Readonly<{ orders: OrderHistoryItem[] }>) {
  return (
    <div className={styles.historyTable}>
      <div className={styles.orderListHeader} aria-hidden="true">
        <span>Замовлення</span>
        <span>Дата</span>
        <span>Позицій</span>
        <span>Сума</span>
        <span>Статус</span>
        <span>Дія</span>
      </div>
      <ul className={styles.orderList}>
        {orders.map((order) => (
          <li key={order.orderId} className={styles.orderCard}>
            <div className={styles.orderIdentity}>
              <span>Замовлення</span>
              <strong>{order.orderId}</strong>
            </div>
            <dl className={styles.compactSummary}>
              <div>
                <dt>Дата</dt>
                <dd>{formatOrderDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt>Позицій</dt>
                <dd>{order.itemCount}</dd>
              </div>
              <div>
                <dt>Сума</dt>
                <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
              </div>
            </dl>
            <div className={styles.orderStatus}>
              <OrderStatusBadge status={order.status} />
            </div>
            <Link href={`/orders/${order.orderId}`}>Переглянути</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
