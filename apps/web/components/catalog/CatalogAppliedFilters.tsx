import { XIcon } from "lucide-react";
import type { CatalogQueryState } from "@/lib/catalog/catalog-query";
import type { CatalogFilterOptionsResponse } from "@/lib/catalog/catalog-types";
import { conditionLabel } from "@/lib/catalog/catalog-presentation";
import styles from "./CatalogAppliedFilters.module.css";

type CatalogAppliedFiltersProps = {
  state: CatalogQueryState;
  options?: CatalogFilterOptionsResponse;
  onSearchChange: (value: string) => void;
  onChange: (update: Partial<CatalogQueryState>) => void;
  onCurrencyChange: (currency: string | null) => void;
  onReset: () => void;
};

type AppliedFilter = {
  key: string;
  label: string;
  remove: () => void;
};

export function countAppliedCatalogFilters(state: CatalogQueryState): number {
  return [
    Boolean(state.q),
    Boolean(state.brandId),
    Boolean(state.categoryId),
    Boolean(state.condition),
    state.inStock !== null,
    Boolean(state.currency),
    Boolean(state.minPrice || state.maxPrice),
  ].filter(Boolean).length;
}

export function CatalogAppliedFilters({
  state,
  options,
  onSearchChange,
  onChange,
  onCurrencyChange,
  onReset,
}: Readonly<CatalogAppliedFiltersProps>) {
  const filters: AppliedFilter[] = [];
  const brand = options?.data.brands.find(({ id }) => id === state.brandId);
  const category = options?.data.categories.find(({ id }) => id === state.categoryId);

  if (state.q) {
    filters.push({ key: "q", label: `Пошук: ${state.q}`, remove: () => onSearchChange("") });
  }
  if (state.brandId) {
    filters.push({ key: "brand", label: `Бренд: ${brand?.name ?? "вибрано"}`, remove: () => onChange({ brandId: null }) });
  }
  if (state.categoryId) {
    filters.push({ key: "category", label: `Категорія: ${category?.name ?? "вибрано"}`, remove: () => onChange({ categoryId: null }) });
  }
  if (state.condition) {
    filters.push({ key: "condition", label: `Стан: ${conditionLabel(state.condition)}`, remove: () => onChange({ condition: null }) });
  }
  if (state.inStock !== null) {
    filters.push({ key: "stock", label: state.inStock ? "В наявності" : "Немає в наявності", remove: () => onChange({ inStock: null }) });
  }
  if (state.currency) {
    filters.push({ key: "currency", label: `Валюта: ${state.currency}`, remove: () => onCurrencyChange(null) });
  }
  if (state.minPrice || state.maxPrice) {
    filters.push({
      key: "price",
      label: `Ціна: ${state.minPrice ?? "0"}–${state.maxPrice ?? "∞"} ${state.currency ?? ""}`.trim(),
      remove: () => onChange({ minPrice: null, maxPrice: null }),
    });
  }

  if (filters.length === 0) return null;

  return (
    <div className={styles.row} aria-label="Застосовані фільтри">
      <span className={styles.label}>Застосовано</span>
      <div className={styles.chips}>
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={styles.chip}
            aria-label={`Прибрати фільтр: ${filter.label}`}
            onClick={filter.remove}
          >
            <span>{filter.label}</span>
            <XIcon aria-hidden="true" />
          </button>
        ))}
      </div>
      <button type="button" className={styles.reset} onClick={onReset}>
        Очистити все
      </button>
    </div>
  );
}
