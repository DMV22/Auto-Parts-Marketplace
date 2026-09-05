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
        <p>Операційні дані</p>
        <h2 id="inventory-title">Залишки</h2>
        <p>Оновлюйте доступну кількість і перевіряйте актуальну версію перед повтором.</p>
      </header>
      {listings.data.data.length === 0 ? (
        <div className={styles.state}>Немає оголошень для редагування.</div>
      ) : (
        <div className={styles.inventoryGrid}>
          <div className={styles.inventoryHeader} aria-hidden="true">
            <span>SKU / Деталь</span>
            <span>Статус</span>
            <span>Поточний залишок</span>
            <span>Нова кількість</span>
            <span>Версія</span>
            <span>Дія</span>
          </div>
        <ul className={styles.inventoryList}>
          {listings.data.data.map((listing) => (
            <li key={listing.id} className={styles.inventoryRow}>
              <div className={styles.inventoryIdentity}>
                <strong className={styles.identifier}>
                  {listing.productVariant.sku}
                </strong>
                <span className={styles.meta}>
                  MPN {listing.productVariant.manufacturerPartNumber}
                </span>
              </div>
              <div className={styles.inventoryListingStatus}>
                <ListingStatusBadge status={listing.status} />
              </div>
              <InventoryEditor supplierId={supplierId} listing={listing} />
            </li>
          ))}
        </ul>
        </div>
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
  const quantityErrorId = `stock-${listing.id}-error`;

  return (
    <div className={styles.inventoryEditor}>
      <div className={styles.inventoryCurrent}>
        <span>Поточний залишок</span>
        <strong>{listing.stockQuantity}</strong>
      </div>
      <div className={styles.field}>
        <label htmlFor={`stock-${listing.id}`}>Нова кількість</label>
        <input
          id={`stock-${listing.id}`}
          inputMode="numeric"
          value={quantity}
          aria-invalid={invalidQuantity}
          aria-describedby={invalidQuantity ? quantityErrorId : undefined}
          disabled={listing.status === "ARCHIVED" || update.isPending}
          onChange={(event) => {
            preserveAttemptRef.current = false;
            update.reset();
            setQuantity(event.target.value);
          }}
        />
        {invalidQuantity ? (
          <span id={quantityErrorId} className={styles.fieldError}>
            Вкажіть ціле невід’ємне число.
          </span>
        ) : null}
      </div>
      <div className={styles.inventoryVersion}>
        <span>Версія</span>
        <strong>{listing.inventoryVersion}</strong>
      </div>
      <Button
        type="button"
        disabled={
          invalidQuantity || listing.status === "ARCHIVED" || update.isPending
        }
        onClick={() => update.mutate(Number(quantity))}
      >
        {update.isPending ? "Оновлюємо…" : feedback?.conflict ? "Повторити" : "Зберегти"}
      </Button>
      {feedback ? (
        <div
          className={feedback.conflict ? styles.inventoryConflict : styles.error}
          role="alert"
        >
          <strong>{feedback.conflict ? "Залишок уже змінився" : "Помилка оновлення"}</strong>
          <p>{feedback.message}</p>
          {feedback.conflict ? (
            <p>
              Актуальний залишок: {listing.stockQuantity} · Версія:{" "}
              {listing.inventoryVersion}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
