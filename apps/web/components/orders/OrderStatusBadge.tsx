import type { OrderStatus } from "@/lib/commerce/checkout-types";
import { presentOrderStatus } from "@/lib/commerce/order-presentation";
import styles from "./orders.module.css";

export function OrderStatusBadge({ status }: Readonly<{ status: OrderStatus }>) {
  const presentation = presentOrderStatus(status);
  return (
    <span className={styles.statusBadge} data-tone={presentation.tone}>
      {presentation.label}
    </span>
  );
}
