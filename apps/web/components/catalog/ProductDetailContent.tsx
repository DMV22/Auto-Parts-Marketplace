import type { ProductDetail } from "@/lib/catalog/catalog-types";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
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
  const listings = product.variants.flatMap((variant) => variant.listings);
  const availableListings = listings.filter((listing) => listing.inStock);
  const currencies = new Set(listings.map((listing) => listing.currency));
  const priceSummary = summarizePrices(listings, currencies);

  return (
    <>
      <section className={styles.hero} aria-labelledby="product-title">
        <div className={styles.media}>
          <ProductMedia label={product.category?.name ?? product.brand.name} />
        </div>
        <aside className={styles.summary} aria-label="Коротко про товар">
          <div className={styles.taxonomy}>
            <p className={styles.brand}>{product.brand.name}</p>
            {product.category ? <span aria-hidden="true">/</span> : null}
            {product.category ? (
              <p className={styles.category}>{product.category.name}</p>
            ) : null}
          </div>
          <h1 id="product-title">{product.name}</h1>
          <p className={styles.description}>
            {product.description ?? "Опис товару ще не додано."}
          </p>

          <div className={styles.commercialSummary}>
            <span>Ціна у доступних пропозиціях</span>
            <strong>{priceSummary}</strong>
            <p>
              {availableListings.length} з {listings.length} пропозицій зараз у
              наявності
            </p>
          </div>

          <a className={styles.offersLink} href="#product-offers">
            Переглянути пропозиції
          </a>
          <p className={styles.decisionNote}>
            Постачальника, стан і конкретну ціну можна обрати нижче. Сумісність
            перевіряється окремо для кожної модифікації.
          </p>
        </aside>
      </section>

      <PdpVehicleContext model={vehicle} />

      <section
        className={styles.variants}
        id="product-offers"
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

type ProductListing = ProductDetail["variants"][number]["listings"][number];

function summarizePrices(
  listings: ProductListing[],
  currencies: Set<string>,
): string {
  const firstListing = listings[0];
  if (!firstListing) return "Пропозицій поки немає";
  if (currencies.size !== 1) return "Кілька валют";

  const currency = firstListing.currency;
  const prices = listings.map((listing) => Number(listing.price));
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);

  if (minimum === maximum) return formatMoney(String(minimum), currency);
  return `${formatMoney(String(minimum), currency)} — ${formatMoney(String(maximum), currency)}`;
}
