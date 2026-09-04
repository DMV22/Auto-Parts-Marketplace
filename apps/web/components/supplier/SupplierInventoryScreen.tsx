"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supplierListingsQueryOptions } from "@/lib/query/supplier-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { updateSupplierStock } from "@/lib/supplier/supplier-api";
import { inventoryError } from "@/lib/supplier/supplier-presentation";
import type { SupplierListing } from "@/lib/supplier/supplier-types";
import { ListingStatusBadge } from "./ListingStatusBadge";
import styles from "./supplier.module.css";

export function SupplierInventoryScreen({
  supplierId,
}: Readonly<{ supplierId: string }>) {
  const listings = useQuery(
    supplierListingsQueryOptions(supplierId, {
      pageSize: 50,
      sort: "updated_desc",
    }),
  );

  if (listings.isPending) return <p role="status">Завантажуємо залишки…</p>;
  if (listings.isError) {
    return (
      <section className={styles.state}>
        <h2>Не вдалося завантажити залишки</h2>
        <Button type="button" variant="outline" onClick={() => void listings.refetch()}>
          Спробувати ще раз
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.workspace} aria-labelledby="inventory-title">
      <header className={styles.heading}>
        <h2 id="inventory-title">Залишки</h2>
        <p>Кожна зміна використовує актуальний inventoryVersion.</p>
      </header>
      {listings.data.data.length === 0 ? (
        <div className={styles.state}>Немає оголошень для редагування.</div>
      ) : (
        <ul className={styles.list}>
          {listings.data.data.map((listing) => (
            <li key={listing.id} className={styles.card}>
              <div>
                <strong>{listing.productVariant.sku}</strong>
                <ListingStatusBadge status={listing.status} />
              </div>
              <InventoryEditor supplierId={supplierId} listing={listing} />
            </li>
          ))}
        </ul>
      )}
      {listings.data.meta.nextCursor ? (
        <p className={styles.warning}>
          Показано перші 50 оголошень. Наступні сторінки доступні через Listings.
        </p>
      ) : null}
    </section>
  );
}

export function InventoryEditor({
  supplierId,
  listing,
}: Readonly<{ supplierId: string; listing: SupplierListing }>) {
  const [quantity, setQuantity] = useState(String(listing.stockQuantity));
  const preserveAttemptRef = useRef(false);
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (requestedQuantity: number) =>
      updateSupplierStock(supplierId, listing.id, {
        quantity: requestedQuantity,
        expectedVersion: listing.inventoryVersion,
      }),
    onSuccess: async (updated) => {
      preserveAttemptRef.current = false;
      queryClient.setQueryData(
        queryKeys.supplier.listing(supplierId, listing.id),
        updated,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.supplier.listingsRoot(supplierId),
      });
    },
    onError: async (error) => {
      if (inventoryError(error).conflict) {
        preserveAttemptRef.current = true;
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.supplier.listing(supplierId, listing.id),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.supplier.listingsRoot(supplierId),
          }),
        ]);
      }
    },
  });

  useEffect(() => {
    if (!preserveAttemptRef.current) {
      setQuantity(String(listing.stockQuantity));
    }
  }, [listing.stockQuantity, listing.inventoryVersion]);

  const feedback = update.error ? inventoryError(update.error) : null;
  const invalidQuantity =
    !/^\d+$/.test(quantity) || Number(quantity) > 2_147_483_647;

  return (
    <div className={styles.stack}>
      <div className={styles.field}>
        <label htmlFor={`stock-${listing.id}`}>Кількість</label>
        <input
          id={`stock-${listing.id}`}
          inputMode="numeric"
          value={quantity}
          aria-invalid={invalidQuantity}
          disabled={listing.status === "ARCHIVED" || update.isPending}
          onChange={(event) => {
            preserveAttemptRef.current = false;
            update.reset();
            setQuantity(event.target.value);
          }}
        />
      </div>
      <p className={styles.meta}>
        Актуальний залишок: {listing.stockQuantity}; версія: {listing.inventoryVersion}
      </p>
      {feedback ? (
        <p className={styles.error} role="alert">
          {feedback.message}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={
          invalidQuantity || listing.status === "ARCHIVED" || update.isPending
        }
        onClick={() => update.mutate(Number(quantity))}
      >
        {update.isPending ? "Оновлюємо…" : feedback?.conflict ? "Повторити" : "Зберегти"}
      </Button>
    </div>
  );
}
