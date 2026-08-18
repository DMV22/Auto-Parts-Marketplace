import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog/catalog-types";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import { ProductMedia } from "./ProductMedia";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: Readonly<{ product: CatalogProduct }>) {
  const offerCount = product.variants.reduce(
    (total, variant) => total + variant.listings.length,
    0,
  );

  return (
    <article className={styles.card}>
      <ProductMedia />
      <div className={styles.body}>
        <p className={styles.brand}>{product.brand.name}</p>
        <h2>
          <Link href={`/products/${product.id}`}>{product.name}</Link>
        </h2>
        {product.category ? (
          <p className={styles.category}>{product.category.name}</p>
        ) : null}
        <div className={styles.commercial}>
          <p className={styles.price}>
            {product.minimumPrice
              ? `від ${formatMoney(product.minimumPrice.amount, product.minimumPrice.currency)}`
              : "Оберіть валюту, щоб побачити ціну"}
          </p>
          <p>
            {offerCount} {offerCount === 1 ? "пропозиція" : "пропозицій"}
          </p>
        </div>
      </div>
    </article>
  );
}
