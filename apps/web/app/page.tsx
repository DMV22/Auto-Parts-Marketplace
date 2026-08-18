import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main id="main-content" className={styles.main}>
      <section className={styles.content} aria-labelledby="home-title">
        <p className={styles.eyebrow}>Fitment-aware marketplace</p>
        <h1 id="home-title" className={styles.title}>
          Запчастини, сумісні з вашим авто
        </h1>
        <p className={styles.description}>
          Увійдіть або створіть Customer-акаунт. Каталог, гараж і покупки
          підключатимуться наступними frontend milestones поверх готового API.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/sign-up">
            Створити акаунт
          </Link>
          <Link href="/sign-in">Увійти</Link>
        </div>
      </section>
    </main>
  );
}
