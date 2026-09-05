"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import { formatOrderDate } from "@/lib/commerce/order-presentation";
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
        <p>Доступ міг змінитися або сервіс тимчасово недоступний.</p>
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
          <p>Керування пропозиціями</p>
          <h2 id="supplier-listings-title">Оголошення</h2>
          <p>Контролюйте публікацію, ціну й доступний залишок.</p>
        </div>
        <Link
          className={styles.primaryLink}
          href={`/supplier/${supplierId}/listings/new`}
        >
          <PlusIcon aria-hidden="true" />
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
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className="sr-only">Оголошення поточного постачальника</caption>
            <thead>
              <tr>
                <th scope="col">SKU / Деталь</th>
                <th scope="col">Стан</th>
                <th scope="col">Ціна</th>
                <th scope="col">Залишок</th>
                <th scope="col">Статус</th>
                <th scope="col">Оновлено</th>
                <th scope="col">Дія</th>
              </tr>
            </thead>
            <tbody>
              {listings.data.data.map((listing) => (
                <tr key={listing.id}>
                  <td data-label="SKU / Деталь">
                    <strong className={styles.identifier}>
                      {listing.productVariant.sku}
                    </strong>
                    <span className={styles.meta}>
                      MPN {listing.productVariant.manufacturerPartNumber}
                    </span>
                  </td>
                  <td data-label="Стан">{conditionLabel(listing.condition)}</td>
                  <td data-label="Ціна" className={styles.numericValue}>
                    {formatMoney(listing.price, listing.currency)}
                  </td>
                  <td data-label="Залишок" className={styles.numericValue}>
                    {listing.stockQuantity}
                    <span className={styles.meta}>
                      версія {listing.inventoryVersion}
                    </span>
                  </td>
                  <td data-label="Статус">
                    <ListingStatusBadge status={listing.status} />
                  </td>
                  <td data-label="Оновлено">
                    <time dateTime={listing.updatedAt}>
                      {formatOrderDate(listing.updatedAt)}
                    </time>
                  </td>
                  <td data-label="Дія">
                    <Link
                      className={styles.rowAction}
                      href={`/supplier/${supplierId}/listings/${listing.id}`}
                    >
                      Відкрити
                      <ArrowRightIcon aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function conditionLabel(condition: "NEW" | "USED" | "REMANUFACTURED"): string {
  if (condition === "NEW") return "Новий";
  if (condition === "USED") return "Вживаний";
  return "Відновлений";
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
