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
    <ul className={styles.orderList}>
      {orders.map((order) => (
        <li key={order.orderId} className={styles.orderCard}>
          <div className={styles.orderCardHeading}>
            <div>
              <span>Замовлення</span>
              <strong>{order.orderId}</strong>
            </div>
            <OrderStatusBadge status={order.status} />
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
          <Link href={`/orders/${order.orderId}`}>Переглянути замовлення</Link>
        </li>
      ))}
    </ul>
  );
}
