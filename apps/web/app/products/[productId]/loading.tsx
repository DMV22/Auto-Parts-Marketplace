import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main id="main-content" className={styles.main} aria-busy="true">
      <p role="status">Завантажуємо товар…</p>
    </main>
  );
}
