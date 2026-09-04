"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supplierListingQueryOptions } from "@/lib/query/supplier-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { transitionSupplierListing } from "@/lib/supplier/supplier-api";
import {
  availableListingActions,
  listingFormError,
  presentListingAction,
} from "@/lib/supplier/supplier-presentation";
import { ListingStatusBadge } from "./ListingStatusBadge";
import { SupplierListingForm } from "./SupplierListingForm";
import { InventoryEditor } from "./SupplierInventoryScreen";
import styles from "./supplier.module.css";

export function SupplierListingDetail({
  supplierId,
  listingId,
}: Readonly<{ supplierId: string; listingId: string }>) {
  const listing = useQuery(supplierListingQueryOptions(supplierId, listingId));
  const queryClient = useQueryClient();
  const router = useRouter();
  const transition = useMutation({
    mutationFn: (action: "submit" | "pause" | "resume" | "archive") =>
      transitionSupplierListing(supplierId, listingId, action),
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        queryKeys.supplier.listing(supplierId, listingId),
        updated,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.supplier.listingsRoot(supplierId),
      });
    },
  });

  if (listing.isPending) return <p role="status">Завантажуємо оголошення…</p>;
  if (listing.isError) {
    return (
      <section className={styles.state}>
        <h2>Оголошення недоступне</h2>
        <p>Його не знайдено або воно належить іншому постачальнику.</p>
        <Link href={`/supplier/${supplierId}/listings`}>До списку</Link>
      </section>
    );
  }

  const item = listing.data;
  const editable =
    item.status !== "PENDING_APPROVAL" && item.status !== "ARCHIVED";

  return (
    <section className={styles.workspace} aria-labelledby="listing-detail-title">
      <div className={styles.toolbar}>
        <div className={styles.heading}>
          <h2 id="listing-detail-title">{item.productVariant.sku}</h2>
          <ListingStatusBadge status={item.status} />
        </div>
        <Link href={`/supplier/${supplierId}/listings`}>До оголошень</Link>
      </div>

      <div className={styles.detail}>
        <p>
          Public visibility: <strong>{item.status === "ACTIVE" ? "так" : "ні"}</strong>
        </p>
        {item.rejectionReason ? (
          <p className={styles.warning}>Причина відхилення: {item.rejectionReason}</p>
        ) : null}
        {item.moderationReason ? (
          <p className={styles.warning}>
            Призупинено Admin: {item.moderationReason}
          </p>
        ) : null}
        <div className={styles.actions}>
          {availableListingActions(item).map((action) => (
            <Button
              key={action}
              type="button"
              variant={action === "archive" ? "destructive" : "outline"}
              disabled={transition.isPending}
              onClick={() => transition.mutate(action)}
            >
              {presentListingAction(action)}
            </Button>
          ))}
        </div>
        {transition.error ? (
          <p className={styles.error} role="alert">
            {listingFormError(transition.error)}
          </p>
        ) : null}
      </div>

      {editable ? (
        <div className={styles.detail}>
          <h3>Редагувати</h3>
          <SupplierListingForm
            supplierId={supplierId}
            listing={item}
            onSaved={(saved) => {
              queryClient.setQueryData(
                queryKeys.supplier.listing(supplierId, listingId),
                saved,
              );
              router.refresh();
            }}
          />
        </div>
      ) : (
        <p className={styles.warning}>
          У цьому статусі редагування заборонене backend policy.
        </p>
      )}
      <div className={styles.detail}>
        <h3>Залишок</h3>
        <InventoryEditor supplierId={supplierId} listing={item} />
      </div>
    </section>
  );
}
