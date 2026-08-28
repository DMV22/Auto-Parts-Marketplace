import { ImageOffIcon } from "lucide-react";
import styles from "./ProductMedia.module.css";

export function ProductMedia() {
  return (
    <div className={styles.placeholder}>
      <ImageOffIcon aria-hidden="true" />
      <span>Зображення ще не додано</span>
    </div>
  );
}
