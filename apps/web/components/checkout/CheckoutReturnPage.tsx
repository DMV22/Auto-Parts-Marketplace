import { z } from "zod";
import type { CheckoutReturnMode } from "@/lib/commerce/checkout-presentation";
import { CheckoutStatus } from "./CheckoutStatus";
import styles from "./CheckoutReturnPage.module.css";

export function CheckoutReturnPage({
  mode,
  rawOrderId,
}: Readonly<{ mode: CheckoutReturnMode; rawOrderId?: string }>) {
  const parsedOrderId = z.uuid().safeParse(rawOrderId);
  const success = mode === "success";

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <p>Stripe Checkout</p>
        <h1>{success ? "Перевіряємо оплату" : "Checkout не завершено"}</h1>
        <span>
          Редирект не змінює статус замовлення. Остаточну відповідь надає
          backend після перевіреного Stripe webhook.
        </span>
      </header>

      {parsedOrderId.success ? (
        <CheckoutStatus orderId={parsedOrderId.data} mode={mode} />
      ) : (
        <section className={styles.invalid} aria-labelledby="invalid-order-title">
          <h2 id="invalid-order-title">Некоректне посилання на замовлення</h2>
          <p role="alert">
            URL не містить валідного orderId. Поверніться до кошика та почніть
            нову checkout-спробу.
          </p>
        </section>
      )}
    </main>
  );
}
