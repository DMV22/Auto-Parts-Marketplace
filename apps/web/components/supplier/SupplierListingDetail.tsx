"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
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
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const archiveConfirmationId = useId();
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
      setConfirmingArchive(false);
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
  const actions = availableListingActions(item);
  const primaryAction = actions.find((action) => action === "submit");
  const operationalActions = actions.filter(
    (action) => action !== "submit" && action !== "archive",
  );
  const canArchive = actions.includes("archive");

  return (
    <section className={styles.workspace} aria-labelledby="listing-detail-title">
      <div className={styles.toolbar}>
        <div className={styles.heading}>
          <p>Оголошення</p>
          <h2 id="listing-detail-title">{item.productVariant.sku}</h2>
          <div className={styles.statusRow}>
            <ListingStatusBadge status={item.status} />
            <span className={styles.visibilityState}>
              {item.status === "ACTIVE" ? "Видиме в каталозі" : "Не опубліковано"}
            </span>
          </div>
        </div>
        <Link href={`/supplier/${supplierId}/listings`}>До оголошень</Link>
      </div>

      <div className={styles.listingDetailGrid}>
        <div className={styles.listingMainColumn}>
        {item.rejectionReason ? (
          <div className={styles.warning} role="status">
            <strong>Причина відхилення</strong>
            <p>{item.rejectionReason}</p>
          </div>
        ) : null}
        {item.moderationReason ? (
          <div className={styles.warning} role="status">
            <strong>Призупинено адміністратором</strong>
            <p>{item.moderationReason}</p>
          </div>
        ) : null}

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
        <div className={styles.warning} role="status">
          <strong>Редагування недоступне</strong>
          <p>Зміни стануть доступними після завершення поточного етапу.</p>
        </div>
      )}
        </div>

        <aside className={styles.listingActionRail} aria-label="Дії з оголошенням">
          <section className={styles.detail}>
            <h3>Життєвий цикл</h3>
            {primaryAction ? (
              <Button
                type="button"
                disabled={transition.isPending}
                onClick={() => transition.mutate(primaryAction)}
              >
                {presentListingAction(primaryAction)}
              </Button>
            ) : null}
            {operationalActions.map((action) => (
              <Button
                key={action}
                type="button"
                variant="outline"
                disabled={transition.isPending}
                onClick={() => transition.mutate(action)}
              >
                {presentListingAction(action)}
              </Button>
            ))}
            {transition.error ? (
              <p className={styles.error} role="alert">
                {listingFormError(transition.error)}
              </p>
            ) : null}
          </section>

          <section className={styles.detail}>
            <h3>Залишок</h3>
            <InventoryEditor supplierId={supplierId} listing={item} />
          </section>

          {canArchive ? (
            <section className={styles.dangerZone}>
              <h3>Архів</h3>
              <p>Архівоване оголошення не можна редагувати.</p>
              <Button
                type="button"
                variant="destructive"
                disabled={transition.isPending}
                aria-expanded={confirmingArchive}
                aria-controls={`${archiveConfirmationId}-panel`}
                onClick={() => setConfirmingArchive(true)}
              >
                Архівувати
              </Button>
              {confirmingArchive ? (
                <div
                  id={`${archiveConfirmationId}-panel`}
                  className={styles.archiveConfirmation}
                  aria-live="polite"
                >
                  <strong>Архівувати це оголошення?</strong>
                  <div className={styles.actions}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={transition.isPending}
                      onClick={() => setConfirmingArchive(false)}
                    >
                      Залишити активним
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={transition.isPending}
                      onClick={() => transition.mutate("archive")}
                    >
                      {transition.isPending ? "Архівуємо…" : "Підтвердити"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
