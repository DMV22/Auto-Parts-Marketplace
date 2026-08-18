"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { productDetailQueryOptions } from "@/lib/query/catalog-queries";
import { ProductDetailContent } from "./ProductDetailContent";
import { useCatalogVehicleContext } from "./useCatalogVehicleContext";
import styles from "./ProductDetailPage.module.css";

export function ProductDetailPage({
  productId,
}: Readonly<{ productId: string }>) {
  const vehicle = useCatalogVehicleContext();
  const product = useQuery(
    productDetailQueryOptions(productId, vehicle.savedVehicleId),
  );

  return (
    <main id="main-content" className={styles.main}>
      <Link className={styles.backLink} href="/catalog">
        ← Повернутися до каталогу
      </Link>

      {product.isPending ? (
        <p role="status" className={styles.pageState}>Завантажуємо товар…</p>
      ) : product.isError || !product.data ? (
        <section className={styles.pageState} aria-labelledby="pdp-error-title">
          <h1 id="pdp-error-title">Не вдалося відкрити товар</h1>
          <p>Товар недоступний або запит завершився помилкою.</p>
          <button type="button" onClick={() => void product.refetch()}>
            Спробувати ще раз
          </button>
        </section>
      ) : (
        <ProductDetailContent
          product={product.data.data}
          vehicle={vehicle.model}
          fitmentState={product.isPlaceholderData ? "pending" : "resolved"}
        />
      )}
    </main>
  );
}
