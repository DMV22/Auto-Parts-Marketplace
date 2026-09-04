import type { ListingStatus } from "@/lib/supplier/supplier-types";
import { presentListingStatus } from "@/lib/supplier/supplier-presentation";
import styles from "./supplier.module.css";

export function ListingStatusBadge({
  status,
}: Readonly<{ status: ListingStatus }>) {
  return (
    <span className={styles.badge} data-public={status === "ACTIVE"}>
      {presentListingStatus(status)}
    </span>
  );
}
