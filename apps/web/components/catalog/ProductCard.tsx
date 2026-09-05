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
  const inStockCount = product.variants.reduce(
    (total, variant) =>
      total + variant.listings.filter((listing) => listing.inStock).length,
    0,
  );
  const titleId = `catalog-product-${product.id}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <ProductMedia label={product.category?.name ?? product.brand.name} />
      <div className={styles.body}>
        <div className={styles.meta}>
          <p className={styles.brand}>{product.brand.name}</p>
          {product.category ? (
            <p className={styles.category}>{product.category.name}</p>
          ) : null}
        </div>
        <h2 id={titleId}>{product.name}</h2>
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
        <div className={styles.footer}>
          <p data-available={inStockCount > 0}>
            {inStockCount > 0 ? `${inStockCount} в наявності` : "Наразі немає в наявності"}
          </p>
          <Link href={`/products/${product.id}`}>Переглянути деталі</Link>
        </div>
      </div>
    </article>
  );
}
