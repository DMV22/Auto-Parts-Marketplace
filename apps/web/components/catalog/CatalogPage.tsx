"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogFilterOptionsResponse } from "@/lib/catalog/catalog-types";
import {
  defaultCatalogQuery,
  parseCatalogSearchParams,
  serializeCatalogQuery,
  type CatalogQueryState,
  withCatalogFilter,
} from "@/lib/catalog/catalog-query";
import { getActiveSavedVehicleId } from "@/lib/garage/active-vehicle";
import type { GarageVehicle } from "@/lib/garage/garage-types";
import {
  catalogFilterOptionsQueryOptions,
  catalogProductsQueryOptions,
} from "@/lib/query/catalog-queries";
import { garageVehiclesQueryOptions } from "@/lib/query/garage-queries";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { CatalogFilters } from "./CatalogFilters";
import { ProductCard } from "./ProductCard";
import styles from "./CatalogPage.module.css";

export function CatalogPage() {
  const router = useRouter();
  const rawSearchParams = useSearchParams();
  const rawSearch = rawSearchParams.toString();
  const parsed = useMemo(
    () => parseCatalogSearchParams(new URLSearchParams(rawSearch)),
    [rawSearch],
  );
  const [searchDraft, setSearchDraft] = useState(parsed.state.q);
  const [useActiveVehicle, setUseActiveVehicle] = useState(true);
  const session = useQuery(sessionQueryOptions());
  const filterOptions = useQuery(catalogFilterOptionsQueryOptions());
  const isCustomer =
    session.data?.user.role === "CUSTOMER" && session.data.user.isActive;
  const garage = useQuery({
    ...garageVehiclesQueryOptions(),
    enabled: isCustomer,
  });
  const activeVehicle = garage.data?.find((vehicle) => vehicle.isActive) ?? null;
  const savedVehicleId = useActiveVehicle
    ? getActiveSavedVehicleId(garage.data)
    : null;
  const effectiveState = useMemo(
    () => withDefaultCurrency(parsed.state, filterOptions.data),
    [parsed.state, filterOptions.data],
  );
  const contextReady = !session.isPending && (!isCustomer || !garage.isPending);
  const catalog = useQuery({
    ...catalogProductsQueryOptions(effectiveState, savedVehicleId),
    enabled: contextReady,
  });

  const navigate = useCallback(
    (state: CatalogQueryState) => {
      const params = serializeCatalogQuery(state);
      router.replace(`/catalog${params.size ? `?${params.toString()}` : ""}`, {
        scroll: false,
      });
    },
    [router],
  );

  useEffect(() => {
    if (!parsed.wasNormalized) return;
    const suffix = parsed.searchParams.size
      ? `?${parsed.searchParams.toString()}`
      : "";
    router.replace(`/catalog${suffix}`, { scroll: false });
  }, [parsed.searchParams, parsed.wasNormalized, router]);

  useEffect(() => setSearchDraft(parsed.state.q), [parsed.state.q]);

  useEffect(() => {
    if (searchDraft.trim() === parsed.state.q) return;
    const timeout = window.setTimeout(
      () => navigate(withCatalogFilter(parsed.state, { q: searchDraft.trim() })),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [navigate, parsed.state, searchDraft]);

  useEffect(() => {
    const currencies = filterOptions.data?.data.currencies;
    const onlyCurrency = currencies?.length === 1 ? currencies[0] : undefined;
    if (parsed.state.currency || !onlyCurrency) return;
    navigate(withCatalogFilter(parsed.state, { currency: onlyCurrency.code }));
  }, [filterOptions.data, navigate, parsed.state]);

  useEffect(() => {
    const options = filterOptions.data;
    if (!options || options.meta.truncated) return;
    const update = invalidVocabulary(parsed.state, options);
    if (Object.keys(update).length > 0) {
      navigate(withCatalogFilter(parsed.state, update));
    }
  }, [filterOptions.data, navigate, parsed.state]);

  const changeFilter = (update: Partial<CatalogQueryState>) =>
    navigate(withCatalogFilter(parsed.state, update));
  const changeCurrency = (currency: string | null) =>
    changeFilter({
      currency,
      minPrice: null,
      maxPrice: null,
      sort: parsed.state.sort.startsWith("price_")
        ? "newest"
        : parsed.state.sort,
    });

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Каталог запчастин</p>
        <h1>Знайдіть деталь для свого автомобіля</h1>
        <p>Пошук і фільтри виконуються на сервері серед публічних пропозицій.</p>
      </header>

      <VehicleContext
        activeVehicle={activeVehicle}
        enabled={Boolean(savedVehicleId)}
        garageError={garage.isError}
        onToggle={() => setUseActiveVehicle((current) => !current)}
      />

      {parsed.wasNormalized ? (
        <div role="status" className={styles.notice}>
          <span>Деякі параметри каталогу було скинуто.</span>
          <button type="button" onClick={() => navigate(defaultCatalogQuery)}>
            Скинути всі фільтри
          </button>
        </div>
      ) : null}

      <div className={styles.layout}>
        <CatalogFilters
          state={effectiveState}
          searchDraft={searchDraft}
          options={filterOptions.data}
          optionsPending={filterOptions.isPending}
          optionsError={filterOptions.isError}
          onOptionsRetry={() => void filterOptions.refetch()}
          onSearchChange={setSearchDraft}
          onFilterChange={changeFilter}
          onCurrencyChange={changeCurrency}
          onReset={() => navigate(defaultCatalogQuery)}
        />

        <section className={styles.results} aria-labelledby="catalog-results">
          <div className={styles.resultsHeading}>
            <h2 id="catalog-results">Результати</h2>
            {catalog.data ? <p>{catalog.data.meta.total} товарів</p> : null}
          </div>

          {!contextReady || catalog.isPending ? (
            <p role="status" className={styles.state}>Завантажуємо каталог…</p>
          ) : catalog.isError ? (
            <div role="alert" className={styles.state}>
              <p>Не вдалося завантажити каталог.</p>
              <button type="button" onClick={() => void catalog.refetch()}>Спробувати ще раз</button>
              <button type="button" onClick={() => navigate(defaultCatalogQuery)}>Скинути фільтри</button>
            </div>
          ) : catalog.data.data.length === 0 ? (
            <div className={styles.state}>
              <p>За цими параметрами товарів не знайдено.</p>
              <button type="button" onClick={() => navigate(defaultCatalogQuery)}>Скинути фільтри</button>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {catalog.data.data.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
              <nav className={styles.pagination} aria-label="Сторінки каталогу">
                <button
                  type="button"
                  disabled={catalog.data.meta.page <= 1}
                  onClick={() => navigate({ ...parsed.state, page: parsed.state.page - 1 })}
                >Попередня</button>
                <span>Сторінка {catalog.data.meta.page} з {catalog.data.meta.totalPages}</span>
                <button
                  type="button"
                  disabled={catalog.data.meta.totalPages === 0 || catalog.data.meta.page >= catalog.data.meta.totalPages}
                  onClick={() => navigate({ ...parsed.state, page: parsed.state.page + 1 })}
                >Наступна</button>
              </nav>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function withDefaultCurrency(
  state: CatalogQueryState,
  options: CatalogFilterOptionsResponse | undefined,
): CatalogQueryState {
  const currencies = options?.data.currencies;
  const onlyCurrency = currencies?.length === 1 ? currencies[0] : undefined;
  return !state.currency && onlyCurrency
    ? { ...state, currency: onlyCurrency.code }
    : state;
}

function invalidVocabulary(
  state: CatalogQueryState,
  options: CatalogFilterOptionsResponse,
): Partial<CatalogQueryState> {
  const update: Partial<CatalogQueryState> = {};
  if (state.brandId && !options.data.brands.some(({ id }) => id === state.brandId)) update.brandId = null;
  if (state.categoryId && !options.data.categories.some(({ id }) => id === state.categoryId)) update.categoryId = null;
  if (state.currency && !options.data.currencies.some(({ code }) => code === state.currency)) {
    update.currency = null;
    update.minPrice = null;
    update.maxPrice = null;
    if (state.sort.startsWith("price_")) update.sort = "newest";
  }
  return update;
}

function VehicleContext({ activeVehicle, enabled, garageError, onToggle }: Readonly<{
  activeVehicle: GarageVehicle | null;
  enabled: boolean;
  garageError: boolean;
  onToggle: () => void;
}>) {
  if (garageError) {
    return <div className={styles.vehicleContext} role="status"><p>Не вдалося застосувати активне авто. Показуємо загальний каталог.</p><Link href="/garage">Відкрити гараж</Link></div>;
  }
  if (!activeVehicle) {
    return <div className={styles.vehicleContext}><p>Оберіть автомобіль, щоб відфільтрувати сумісні запчастини.</p><Link href="/garage">Вибрати автомобіль</Link></div>;
  }
  const vehicleName = `${activeVehicle.year} ${activeVehicle.generation.model.make.name} ${activeVehicle.generation.model.name}`;
  return (
    <div className={styles.vehicleContext}>
      <p>{enabled ? "Каталог відфільтровано для" : "Активне авто"}: <strong>{vehicleName}</strong></p>
      <button type="button" onClick={onToggle}>{enabled ? "Показати всі запчастини" : "Фільтрувати для цього авто"}</button>
    </div>
  );
}
