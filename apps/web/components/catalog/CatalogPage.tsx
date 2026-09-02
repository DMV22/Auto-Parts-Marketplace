"use client";

import { useQuery } from "@tanstack/react-query";
import {
  catalogFilterOptionsQueryOptions,
  catalogProductsQueryOptions,
} from "@/lib/query/catalog-queries";
import { CatalogFilters } from "./CatalogFilters";
import {
  CatalogAppliedFilters,
  countAppliedCatalogFilters,
} from "./CatalogAppliedFilters";
import { CatalogResults, type CatalogResultsModel } from "./CatalogResults";
import { CatalogToolbar } from "./CatalogToolbar";
import { VehicleCatalogContext } from "./VehicleCatalogContext";
import { useCatalogUrlState } from "./useCatalogUrlState";
import { useCatalogVehicleContext } from "./useCatalogVehicleContext";
import styles from "./CatalogPage.module.css";

export function CatalogPage() {
  const filterOptions = useQuery(catalogFilterOptionsQueryOptions());
  const url = useCatalogUrlState(filterOptions.data);
  const vehicle = useCatalogVehicleContext();
  const catalog = useQuery({
    ...catalogProductsQueryOptions(url.state, vehicle.savedVehicleId),
    enabled: vehicle.ready,
  });

  let results: CatalogResultsModel;
  if (!vehicle.ready || catalog.isPending) {
    results = { kind: "loading" };
  } else if (catalog.isError || !catalog.data) {
    results = { kind: "error" };
  } else if (catalog.data.data.length === 0) {
    results = { kind: "empty", response: catalog.data };
  } else {
    results = { kind: "ready", response: catalog.data };
  }

  const optionsState = filterOptions.isPending
    ? ({ kind: "loading" } as const)
    : filterOptions.isError || !filterOptions.data
      ? ({
          kind: "error",
          onRetry: () => void filterOptions.refetch(),
        } as const)
      : ({ kind: "ready", options: filterOptions.data } as const);
  const filterActions = {
    changeFilter: url.changeFilter,
    changeCurrency: url.changeCurrency,
    reset: url.reset,
  };
  const resultTotal =
    results.kind === "empty" || results.kind === "ready"
      ? results.response.meta.total
      : null;

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Каталог запчастин</p>
        <h1>Знайдіть деталь для свого автомобіля</h1>
        <p>Пошук і фільтри виконуються на сервері серед публічних пропозицій.</p>
      </header>

      <VehicleCatalogContext model={vehicle.model} />

      {url.wasNormalized ? (
        <div role="status" className={styles.notice}>
          <span>Деякі параметри каталогу було скинуто.</span>
          <button type="button" onClick={url.reset}>Скинути всі фільтри</button>
        </div>
      ) : null}

      <CatalogToolbar
        search={url.searchDraft}
        sort={url.state.sort}
        currency={url.state.currency}
        total={resultTotal}
        activeFilterCount={countAppliedCatalogFilters(url.state)}
        onSearchChange={url.setSearchDraft}
        onSortChange={(sort) => url.changeFilter({ sort })}
        filters={
          <CatalogFilters
            headingId="catalog-mobile-filters"
            state={url.state}
            optionsState={optionsState}
            actions={filterActions}
          />
        }
      />

      <CatalogAppliedFilters
        state={url.state}
        options={filterOptions.data}
        onSearchChange={url.setSearchDraft}
        onChange={url.changeFilter}
        onCurrencyChange={url.changeCurrency}
        onReset={url.reset}
      />

      <div className={styles.layout}>
        <div className={styles.desktopFilters}>
          <CatalogFilters
            headingId="catalog-desktop-filters"
            state={url.state}
            optionsState={optionsState}
            actions={filterActions}
          />
        </div>
        <CatalogResults
          model={results}
          onRetry={() => void catalog.refetch()}
          onReset={url.reset}
          onPageChange={url.setPage}
        />
      </div>
    </main>
  );
}
