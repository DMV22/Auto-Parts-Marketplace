import { CartBoundary } from "./CartBoundary";
import styles from "./CartPage.module.css";

export function CartPage() {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <p>Перевірка перед оплатою</p>
        <h1>Ваш кошик</h1>
        <span>
          Перевірте пропозиції та кількість. Актуальні ціна й наявність будуть
          підтверджені перед переходом до оплати.
        </span>
      </header>
      <CartBoundary />
    </main>
  );
}
