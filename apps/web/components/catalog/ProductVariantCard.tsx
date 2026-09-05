import type { ProductVariantDetail } from "@/lib/catalog/catalog-types";
import { presentFitment } from "@/lib/catalog/fitment-presentation";
import { FitmentExplanation } from "./FitmentExplanation";
import { ListingOfferList } from "./ListingOfferList";
import styles from "./ProductVariantCard.module.css";

export function ProductVariantCard({
  variant,
  fitmentState,
}: Readonly<{
  variant: ProductVariantDetail;
  fitmentState: "pending" | "resolved";
}>) {
  return (
    <article
      className={styles.variant}
      data-fitment={
        fitmentState === "pending" ? "pending" : variant.fitment.status
      }
    >
      <header className={styles.header}>
        <div>
          <p className={styles.label}>Модифікація</p>
          <h3 translate="no">{variant.sku}</h3>
        </div>
        {fitmentState === "pending" ? (
          <p className={styles.fitmentPending}>
            Оновлюємо сумісність для активного авто…
          </p>
        ) : (
          <FitmentExplanation presentation={presentFitment(variant.fitment)} />
        )}
      </header>

      <dl className={styles.identifiers}>
        <div>
          <dt>Номер виробника</dt>
          <dd translate="no">{variant.manufacturerPartNumber}</dd>
        </div>
        {variant.oemNumber ? (
          <div>
            <dt>OEM-номер</dt>
            <dd translate="no">{variant.oemNumber}</dd>
          </div>
        ) : null}
      </dl>

      <ListingOfferList listings={variant.listings} />
    </article>
  );
}
