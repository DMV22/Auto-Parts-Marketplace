import type { ProductDetail } from "@/lib/catalog/catalog-types";
import type { CatalogVehicleContextModel } from "./useCatalogVehicleContext";
import { PdpVehicleContext } from "./PdpVehicleContext";
import { ProductMedia } from "./ProductMedia";
import { ProductVariantCard } from "./ProductVariantCard";
import styles from "./ProductDetailContent.module.css";

export function ProductDetailContent({
  product,
  vehicle,
  fitmentState,
}: Readonly<{
  product: ProductDetail;
  vehicle: CatalogVehicleContextModel;
  fitmentState: "pending" | "resolved";
}>) {
  return (
    <>
      <section className={styles.hero} aria-labelledby="product-title">
        <div className={styles.media}>
          <ProductMedia />
        </div>
        <div className={styles.summary}>
          <p className={styles.brand}>{product.brand.name}</p>
          <h1 id="product-title">{product.name}</h1>
          {product.category ? (
            <p className={styles.category}>{product.category.name}</p>
          ) : null}
          <p className={styles.description}>
            {product.description ?? "Опис товару ще не додано."}
          </p>
        </div>
      </section>

      <PdpVehicleContext model={vehicle} />

      <section
        className={styles.variants}
        aria-labelledby="variants-title"
        aria-busy={fitmentState === "pending"}
      >
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Модифікації та пропозиції</p>
          <h2 id="variants-title">Оберіть відповідну модифікацію</h2>
        </header>
        {fitmentState === "pending" ? (
          <p role="status" className={styles.fitmentStatus}>
            Оновлюємо сумісність для активного авто…
          </p>
        ) : null}
        {product.variants.map((variant) => (
          <ProductVariantCard
            key={variant.id}
            variant={variant}
            fitmentState={fitmentState}
          />
        ))}
      </section>
    </>
  );
}
