import { ImageOffIcon } from "lucide-react";
import styles from "./ProductMedia.module.css";

export function ProductMedia({ label = "Запчастина" }: Readonly<{ label?: string }>) {
  return (
    <div
      className={styles.placeholder}
      role="img"
      aria-label="Зображення товару відсутнє"
    >
      <span className={styles.marker} aria-hidden="true">PART / 01</span>
      <ImageOffIcon aria-hidden="true" />
      <strong>{label}</strong>
      <span>Фото ще не надано постачальником</span>
    </div>
  );
}
