"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import { supplierListingsQueryOptions } from "@/lib/query/supplier-queries";
import type { SupplierListingsQuery } from "@/lib/supplier/supplier-types";
import { ListingStatusBadge } from "./ListingStatusBadge";
import styles from "./supplier.module.css";

export function SupplierListingsScreen({
  supplierId,
  query,
}: Readonly<{ supplierId: string; query: SupplierListingsQuery }>) {
  const listings = useQuery(supplierListingsQueryOptions(supplierId, query));

  if (listings.isPending) {
    return <p role="status">Завантажуємо оголошення…</p>;
  }
  if (listings.isError) {
    return (
      <section className={styles.state}>
        <h2>Не вдалося завантажити оголошення</h2>
        <p>Доступ міг змінитися або API тимчасово недоступний.</p>
        <Button type="button" variant="outline" onClick={() => void listings.refetch()}>
          Спробувати ще раз
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.workspace} aria-labelledby="supplier-listings-title">
      <div className={styles.toolbar}>
        <div className={styles.heading}>
          <h2 id="supplier-listings-title">Оголошення</h2>
          <p>Статус публікації та операційні дані визначає backend.</p>
        </div>
        <Link href={`/supplier/${supplierId}/listings/new`}>
          Створити оголошення
        </Link>
      </div>

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="listing-status">Статус</label>
          <select id="listing-status" name="status" defaultValue={query.status ?? ""}>
            <option value="">Усі</option>
            <option value="DRAFT">Чернетка</option>
            <option value="PENDING_APPROVAL">Очікує перевірки</option>
            <option value="ACTIVE">Опубліковано</option>
            <option value="PAUSED">Призупинено</option>
            <option value="REJECTED">Відхилено</option>
            <option value="ARCHIVED">Архів</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="listing-condition">Стан</label>
          <select
            id="listing-condition"
            name="condition"
            defaultValue={query.condition ?? ""}
          >
            <option value="">Усі</option>
            <option value="NEW">Новий</option>
            <option value="USED">Вживаний</option>
            <option value="REMANUFACTURED">Відновлений</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="listing-sort">Сортування</label>
          <select id="listing-sort" name="sort" defaultValue={query.sort ?? "updated_desc"}>
            <option value="updated_desc">Нещодавно змінені</option>
            <option value="updated_asc">Найдавніше змінені</option>
            <option value="price_asc">Ціна: від меншої</option>
            <option value="price_desc">Ціна: від більшої</option>
          </select>
        </div>
        <Button type="submit">Застосувати</Button>
      </form>

      {listings.data.data.length === 0 ? (
        <div className={styles.state}>
          <h3>Оголошень не знайдено</h3>
          <p>Змініть фільтри або створіть перше оголошення.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {listings.data.data.map((listing) => (
            <li key={listing.id} className={styles.card}>
              <div className={styles.stack}>
                <div className={styles.statusRow}>
                  <ListingStatusBadge status={listing.status} />
                  <strong>{listing.productVariant.sku}</strong>
                </div>
                <dl className={styles.summary}>
                  <div>
                    <dt>Ціна</dt>
                    <dd>{formatMoney(listing.price, listing.currency)}</dd>
                  </div>
                  <div>
                    <dt>Залишок</dt>
                    <dd>{listing.stockQuantity}</dd>
                  </div>
                  <div>
                    <dt>Inventory version</dt>
                    <dd>{listing.inventoryVersion}</dd>
                  </div>
                </dl>
                {listing.status !== "ACTIVE" ? (
                  <p className={styles.muted}>Не показується у public Catalog/PDP/Cart.</p>
                ) : null}
              </div>
              <Link href={`/supplier/${supplierId}/listings/${listing.id}`}>
                Відкрити
              </Link>
            </li>
          ))}
        </ul>
      )}

      {listings.data.meta.nextCursor ? (
        <div className={styles.pagination}>
          <Link href={nextPageHref(supplierId, query, listings.data.meta.nextCursor)}>
            Наступна сторінка
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function nextPageHref(
  supplierId: string,
  query: SupplierListingsQuery,
  cursor: string,
): string {
  const search = new URLSearchParams();
  if (query.status) search.set("status", query.status);
  if (query.condition) search.set("condition", query.condition);
  if (query.sort) search.set("sort", query.sort);
  search.set("cursor", cursor);
  return `/supplier/${supplierId}/listings?${search.toString()}`;
}
