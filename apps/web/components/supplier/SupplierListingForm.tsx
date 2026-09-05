"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/api/app-error";
import {
  createSupplierListing,
  updateSupplierListing,
} from "@/lib/supplier/supplier-api";
import { listingFormError } from "@/lib/supplier/supplier-presentation";
import type { SupplierListing } from "@/lib/supplier/supplier-types";
import {
  supplierProductVariantQueryOptions,
  supplierProductVariantsQueryOptions,
} from "@/lib/query/supplier-queries";
import { queryKeys } from "@/lib/query/query-keys";
import styles from "./supplier.module.css";

const formSchema = z.object({
  productVariantId: z.uuid("Оберіть варіант товару"),
  condition: z.enum(["NEW", "USED", "REMANUFACTURED"]),
  price: z
    .string()
    .regex(/^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d{0,9}(?:\.\d{1,2})?)$/, "Вкажіть додатну ціну"),
  currency: z.string().regex(/^[A-Z]{3}$/, "Вкажіть три літери валюти"),
});

type ListingFormValues = z.infer<typeof formSchema>;

export function SupplierListingForm({
  supplierId,
  listing,
  onSaved,
}: Readonly<{
  supplierId: string;
  listing?: SupplierListing;
  onSaved: (listing: SupplierListing) => void;
}>) {
  const [search, setSearch] = useState("");
  const [variantCursor, setVariantCursor] = useState<string | null>(null);
  const [variantCursorHistory, setVariantCursorHistory] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(search.trim());
  const variants = useQuery(
    supplierProductVariantsQueryOptions(
      supplierId,
      deferredSearch,
      variantCursor,
    ),
  );
  const queryClient = useQueryClient();
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productVariantId: listing?.productVariant.id ?? "",
      condition: listing?.condition ?? "NEW",
      price: listing?.price ?? "",
      currency: listing?.currency ?? "UAH",
    },
  });
  const save = useMutation({
    mutationFn: (values: ListingFormValues) => {
      if (!listing) return createSupplierListing(supplierId, values);
      const changes: Partial<ListingFormValues> = {};
      if (values.productVariantId !== listing.productVariant.id) {
        changes.productVariantId = values.productVariantId;
      }
      if (values.condition !== listing.condition) {
        changes.condition = values.condition;
      }
      if (values.price !== listing.price) changes.price = values.price;
      if (values.currency !== listing.currency) {
        changes.currency = values.currency;
      }
      return updateSupplierListing(supplierId, listing.id, changes);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.supplier.listingsRoot(supplierId),
      });
      queryClient.setQueryData(
        queryKeys.supplier.listing(supplierId, saved.id),
        saved,
      );
      onSaved(saved);
    },
  });
  const selectedVariantId = form.watch("productVariantId");
  const selectedVariant = useQuery(
    supplierProductVariantQueryOptions(supplierId, selectedVariantId),
  );
  const selectedVariantUnavailable =
    selectedVariantId.length > 0 &&
    selectedVariant.error instanceof AppError &&
    selectedVariant.error.kind === "not_found";
  const selectedVariantLookupError =
    selectedVariantId.length > 0 &&
    selectedVariant.isError &&
    !selectedVariantUnavailable;
  const selectedVariantPending =
    selectedVariantId.length > 0 && selectedVariant.isPending;

  return (
    <form
      className={styles.form}
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      noValidate
    >
      <fieldset className={styles.formSection}>
        <legend>1. Товар</legend>
        <p className={styles.sectionDescription}>
          Знайдіть точний варіант за назвою, SKU, MPN або OEM.
        </p>
        <div className={styles.field}>
        <label htmlFor="variant-search">Пошук варіанта товару</label>
        <input
          id="variant-search"
          name="variantSearch"
          type="search"
          autoComplete="off"
          value={search}
          placeholder="Наприклад, Bosch або BRK-001…"
          onChange={(event) => {
            setSearch(event.target.value);
            setVariantCursor(null);
            setVariantCursorHistory([]);
          }}
        />
        <input type="hidden" {...form.register("productVariantId")} />
        {form.formState.errors.productVariantId ? (
          <p className={styles.error} role="alert">
            {form.formState.errors.productVariantId.message}
          </p>
        ) : null}
        {selectedVariantUnavailable ? (
          <p className={styles.error} role="alert">
            Обраний варіант товару більше недоступний. Оберіть інший результат.
          </p>
        ) : selectedVariantLookupError ? (
          <div className={styles.stack} role="alert">
            <p className={styles.error}>
              Не вдалося перевірити обраний варіант товару. Спробуйте ще раз.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void selectedVariant.refetch()}
            >
              Повторити перевірку
            </Button>
          </div>
        ) : selectedVariant.data ? (
          <p className={styles.success}>
            Обрано: {selectedVariant.data.data.product.name} · {selectedVariant.data.data.sku}
          </p>
        ) : selectedVariantId ? (
          <p className={styles.success}>Перевіряємо обраний варіант…</p>
        ) : null}
        {deferredSearch.length > 1 ? (
          variants.isPending ? (
            <p role="status">Шукаємо варіанти…</p>
          ) : variants.isError ? (
            <p className={styles.error} role="alert">
              Не вдалося виконати пошук варіанта товару.
            </p>
          ) : (
            <>
              {variants.data.data.length === 0 ? (
                <p className={styles.meta} role="status">
                  Варіантів за цим запитом не знайдено.
                </p>
              ) : (
                <ul className={styles.searchResults}>
                  {variants.data.data.map((variant) => (
                    <li key={variant.id} className={styles.searchResult}>
                      <span>
                        <strong>{variant.product.name}</strong>
                        <br />
                        <span className={styles.meta}>
                          {variant.sku} · {variant.product.brand.name}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          form.setValue("productVariantId", variant.id, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        Обрати
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.pagination}>
                {variantCursorHistory.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const history = variantCursorHistory.slice(0, -1);
                      setVariantCursor(history.at(-1) ?? null);
                      setVariantCursorHistory(history);
                    }}
                  >
                    Попередні результати
                  </Button>
                ) : null}
                {variants.data.pageInfo.nextCursor ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setVariantCursorHistory((history) => [
                        ...history,
                        variants.data.pageInfo.nextCursor!,
                      ]);
                      setVariantCursor(variants.data.pageInfo.nextCursor);
                    }}
                  >
                    Наступні результати
                  </Button>
                ) : null}
              </div>
            </>
          )
        ) : (
          <p className={styles.meta}>Введіть щонайменше два символи.</p>
        )}
        </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>2. Пропозиція</legend>
        <p className={styles.sectionDescription}>
          Вкажіть фактичний стан і ціну пропозиції.
        </p>
        <div className={styles.offerFields}>
        <div className={styles.field}>
        <label htmlFor="listing-form-condition">Стан</label>
        <select id="listing-form-condition" {...form.register("condition")}>
          <option value="NEW">Новий</option>
          <option value="USED">Вживаний</option>
          <option value="REMANUFACTURED">Відновлений</option>
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="listing-form-price">Ціна</label>
        <input
          id="listing-form-price"
          inputMode="decimal"
          aria-invalid={Boolean(form.formState.errors.price)}
          {...form.register("price")}
        />
        {form.formState.errors.price ? (
          <p className={styles.error} role="alert">
            {form.formState.errors.price.message}
          </p>
        ) : null}
        </div>
        <div className={styles.field}>
        <label htmlFor="listing-form-currency">Валюта</label>
        <input
          id="listing-form-currency"
          maxLength={3}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(form.formState.errors.currency)}
          {...form.register("currency", {
            setValueAs: (value: string) => value.toUpperCase(),
          })}
        />
        {form.formState.errors.currency ? (
          <p className={styles.error} role="alert">
            {form.formState.errors.currency.message}
          </p>
        ) : null}
        </div>
        </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>3. Публікація</legend>
        <p className={styles.sectionDescription}>
          Збереження не публікує оголошення. Надіслати його на перевірку можна
          після створення чернетки.
        </p>
        {save.error ? (
          <p className={styles.error} role="alert">
            {listingFormError(save.error)}
          </p>
        ) : null}
        <div className={styles.formActions}>
          <Button
            type="submit"
            disabled={
              save.isPending ||
              selectedVariantPending ||
              selectedVariantUnavailable ||
              selectedVariantLookupError ||
              (Boolean(listing) && !form.formState.isDirty)
            }
          >
            {save.isPending
              ? "Зберігаємо…"
              : listing
                ? "Зберегти зміни"
                : "Створити чернетку"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
