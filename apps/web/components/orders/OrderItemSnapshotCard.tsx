import { formatMoney } from "@/lib/catalog/catalog-presentation";
import type { OrderItemSnapshot } from "@/lib/commerce/order-types";
import { presentOrderItemSnapshot } from "@/lib/commerce/order-presentation";
import type { ReactNode } from "react";
import styles from "./orders.module.css";

export function OrderItemSnapshotCard({
  currency,
  item,
  returnContent,
}: Readonly<{
  currency: string;
  item: OrderItemSnapshot;
  returnContent?: ReactNode;
}>) {
  const snapshot = presentOrderItemSnapshot(item);

  return (
    <li className={styles.itemCard}>
      <div>
        <h3>{snapshot.name}</h3>
        <p>
          {[
            snapshot.sku ? `SKU: ${snapshot.sku}` : null,
            snapshot.condition,
          ]
            .filter(Boolean)
            .join(" · ") || "Історичні характеристики недоступні"}
        </p>
        {snapshot.manufacturerPartNumber ? (
          <p>MPN: {snapshot.manufacturerPartNumber}</p>
        ) : null}
        {snapshot.supplierName ? <p>{snapshot.supplierName}</p> : null}
      </div>
      <dl className={styles.itemTotals}>
        <div>
          <dt>Кількість</dt>
          <dd>{item.quantity}</dd>
        </div>
        <div>
          <dt>Ціна</dt>
          <dd>{formatMoney(item.unitPrice, currency)}</dd>
        </div>
        <div>
          <dt>Разом</dt>
          <dd>{formatMoney(item.lineTotal, currency)}</dd>
        </div>
      </dl>
      {returnContent ? (
        <div className={styles.returnSlot}>{returnContent}</div>
      ) : null}
    </li>
  );
}
