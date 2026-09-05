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
      <nav aria-label="Етапи оформлення замовлення">
        <ol className={styles.steps}>
          <li>Кошик</li>
          <li>Stripe Checkout</li>
          <li aria-current="step">Підтвердження</li>
        </ol>
      </nav>
      <header className={styles.header}>
        <p>Статус замовлення</p>
        <h1>{success ? "Перевіряємо оплату" : "Checkout не завершено"}</h1>
        <span>
          Повернення з платіжної сторінки не змінює статус самостійно. Ми
          показуємо лише актуальний стан замовлення.
        </span>
      </header>

      {parsedOrderId.success ? (
        <CheckoutStatus orderId={parsedOrderId.data} mode={mode} />
      ) : (
        <section className={styles.invalid} aria-labelledby="invalid-order-title">
          <h2 id="invalid-order-title">Некоректне посилання на замовлення</h2>
          <p role="alert">
            Посилання не містить коректного номера замовлення. Поверніться до
            кошика та повторіть оформлення.
          </p>
        </section>
      )}
    </main>
  );
}
