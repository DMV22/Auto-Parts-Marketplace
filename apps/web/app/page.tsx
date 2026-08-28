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
          Переглядайте публічний каталог і застосовуйте активне авто з гаража,
          щоб бачити лише релевантні запчастини.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/catalog">
            Відкрити каталог
          </Link>
          <Link href="/garage">Мій гараж</Link>
          <Link href="/sign-up">Створити акаунт</Link>
        </div>
      </section>
    </main>
  );
}
