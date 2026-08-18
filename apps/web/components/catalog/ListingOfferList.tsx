import type { ProductVariantDetail } from "@/lib/catalog/catalog-types";
import { conditionLabel, formatMoney } from "@/lib/catalog/catalog-presentation";
import styles from "./ListingOfferList.module.css";

type ListingOffer = ProductVariantDetail["listings"][number];

export function ListingOfferList({
  listings,
}: Readonly<{ listings: ListingOffer[] }>) {
  return (
    <div className={styles.offers}>
      <h4>Доступні пропозиції</h4>
      {listings.length === 0 ? (
        <p className={styles.empty}>Активних пропозицій немає.</p>
      ) : (
        <ul>
          {listings.map((listing) => (
            <li key={listing.id}>
              <div>
                <strong>{listing.supplier.name}</strong>
                <span>{conditionLabel(listing.condition)}</span>
              </div>
              <div className={styles.commercial}>
                <strong>{formatMoney(listing.price, listing.currency)}</strong>
                <span data-stock={listing.inStock ? "available" : "unavailable"}>
                  {listing.inStock ? "В наявності" : "Немає в наявності"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
