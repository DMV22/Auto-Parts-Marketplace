import type { ChangeEvent } from "react";
import type {
  CatalogQueryState,
  CatalogSort,
  ListingCondition,
} from "@/lib/catalog/catalog-query";
import type { CatalogFilterOptionsResponse } from "@/lib/catalog/catalog-types";
import { conditionLabel } from "@/lib/catalog/catalog-presentation";
import styles from "./CatalogFilters.module.css";

type Props = {
  model: {
    state: CatalogQueryState;
    searchDraft: string;
  };
  optionsState:
    | { kind: "loading" }
    | { kind: "error"; onRetry: () => void }
    | { kind: "ready"; options: CatalogFilterOptionsResponse };
  actions: {
    changeSearch: (value: string) => void;
    changeFilter: (update: Partial<CatalogQueryState>) => void;
    changeCurrency: (currency: string | null) => void;
    reset: () => void;
  };
};

export function CatalogFilters({
  model,
  optionsState,
  actions,
}: Readonly<Props>) {
  const { state, searchDraft } = model;
  const options = optionsState.kind === "ready" ? optionsState.options : undefined;
  const select =
    <T extends string>(handler: (value: T | null) => void) =>
      (event: ChangeEvent<HTMLSelectElement>) =>
        handler((event.target.value || null) as T | null);

  return (
    <aside className={styles.panel} aria-labelledby="catalog-filters-title">
      <div className={styles.heading}>
        <h2 id="catalog-filters-title">Фільтри</h2>
        <button type="button" onClick={actions.reset}>Скинути</button>
      </div>

      <label className={styles.field}>
        <span>Пошук</span>
        <input
          type="search"
          value={searchDraft}
          maxLength={120}
          placeholder="Назва, SKU або номер деталі"
          onChange={(event) => actions.changeSearch(event.target.value)}
        />
      </label>

      {optionsState.kind === "loading" ? <p role="status" className={styles.hint}>Завантажуємо доступні фільтри…</p> : null}
      {optionsState.kind === "error" ? (
        <div role="alert" className={styles.filterError}>
          <p>Не вдалося завантажити Brand, Category та currency filters.</p>
          <button type="button" onClick={optionsState.onRetry}>Спробувати ще раз</button>
        </div>
      ) : null}
      {options?.meta.truncated ? (
        <p className={styles.warning}>Показано перші 100 значень. Список фільтрів може бути неповним.</p>
      ) : null}

      <label className={styles.field}>
        <span>Бренд</span>
        <select
          value={state.brandId ?? ""}
          disabled={!options}
          onChange={select<string>((brandId) => actions.changeFilter({ brandId }))}
        >
          <option value="">Усі бренди</option>
          {options?.data.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </select>
      </label>

      <label className={styles.field}>
        <span>Категорія</span>
        <select
          value={state.categoryId ?? ""}
          disabled={!options}
          onChange={select<string>((categoryId) => actions.changeFilter({ categoryId }))}
        >
          <option value="">Усі категорії</option>
          {options?.data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>

      <label className={styles.field}>
        <span>Стан</span>
        <select
          value={state.condition ?? ""}
          onChange={select<ListingCondition>((condition) => actions.changeFilter({ condition }))}
        >
          <option value="">Будь-який</option>
          <option value="NEW">{conditionLabel("NEW")}</option>
          <option value="USED">{conditionLabel("USED")}</option>
          <option value="REMANUFACTURED">{conditionLabel("REMANUFACTURED")}</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Наявність</span>
        <select
          value={state.inStock === null ? "" : String(state.inStock)}
          onChange={(event) => actions.changeFilter({ inStock: event.target.value === "" ? null : event.target.value === "true" })}
        >
          <option value="">Усі пропозиції</option>
          <option value="true">В наявності</option>
          <option value="false">Немає в наявності</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Валюта</span>
        <select
          value={state.currency ?? ""}
          disabled={!options}
          onChange={(event) => actions.changeCurrency(event.target.value || null)}
        >
          <option value="">Оберіть валюту</option>
          {options?.data.currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}
        </select>
      </label>

      <div className={styles.priceFields}>
        <label className={styles.field}>
          <span>Ціна від</span>
          <input inputMode="decimal" value={state.minPrice ?? ""} disabled={!state.currency} onChange={(event) => actions.changeFilter({ minPrice: event.target.value || null })} />
        </label>
        <label className={styles.field}>
          <span>Ціна до</span>
          <input inputMode="decimal" value={state.maxPrice ?? ""} disabled={!state.currency} onChange={(event) => actions.changeFilter({ maxPrice: event.target.value || null })} />
        </label>
      </div>
      {state.currency ? (
        <p className={styles.hint}>
          Доступний діапазон: {options?.data.currencies.find(({ code }) => code === state.currency)?.minimumPrice ?? "—"}–{options?.data.currencies.find(({ code }) => code === state.currency)?.maximumPrice ?? "—"} {state.currency}
        </p>
      ) : null}

      <label className={styles.field}>
        <span>Сортування</span>
        <select
          value={state.sort}
          onChange={select<CatalogSort>((sort) => actions.changeFilter({ sort: sort ?? "newest" }))}
        >
          <option value="newest">Спочатку нові</option>
          <option value="name_asc">Назва: А–Я</option>
          <option value="name_desc">Назва: Я–А</option>
          {state.currency ? <><option value="price_asc">Ціна: від меншої</option><option value="price_desc">Ціна: від більшої</option></> : null}
        </select>
      </label>
    </aside>
  );
}
