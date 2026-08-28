import { CartBoundary } from "./CartBoundary";
import styles from "./CartPage.module.css";

export function CartPage() {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <p>Server-authoritative commerce</p>
        <h1>Ваш кошик</h1>
        <span>
          Guest identity зберігається тільки в HttpOnly cookie. Остаточні ціна
          та залишок визначаються API.
        </span>
      </header>
      <CartBoundary />
    </main>
  );
}
