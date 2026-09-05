import { ImageOffIcon } from "lucide-react";
import Image from "next/image";
import styles from "./ProductMedia.module.css";

export function ProductMedia({
  label = "Запчастина",
  priority = false,
}: Readonly<{ label?: string; priority?: boolean }>) {
  return (
    <div
      className={styles.placeholder}
      role="img"
      aria-label="Зображення товару відсутнє"
    >
      <Image
        className={styles.artwork}
        src="/images/placeholders/product-technical-fallback.webp"
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 30rem"
      />
      <span className={styles.marker} aria-hidden="true">PART / 01</span>
      <span className={styles.message}>
        <ImageOffIcon aria-hidden="true" />
        <strong>{label}</strong>
        <span>Фото ще не надано постачальником</span>
      </span>
    </div>
  );
}
