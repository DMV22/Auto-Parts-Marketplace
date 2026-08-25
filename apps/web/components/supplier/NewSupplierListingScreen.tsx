"use client";

import { useRouter } from "next/navigation";
import { SupplierListingForm } from "./SupplierListingForm";
import styles from "./supplier.module.css";

export function NewSupplierListingScreen({
  supplierId,
}: Readonly<{ supplierId: string }>) {
  const router = useRouter();
  return (
    <section className={styles.workspace} aria-labelledby="new-listing-title">
      <header className={styles.heading}>
        <h2 id="new-listing-title">Нове оголошення</h2>
        <p>
          Supplier, status, timestamps і початковий stock визначаються сервером.
        </p>
      </header>
      <div className={styles.detail}>
        <SupplierListingForm
          supplierId={supplierId}
          onSaved={(listing) =>
            router.push(`/supplier/${supplierId}/listings/${listing.id}`)
          }
        />
      </div>
    </section>
  );
}
