import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import type {
  CatalogQueryState,
  ListingCondition,
} from "@/lib/catalog/catalog-query";
import type { CatalogFilterOptionsResponse } from "@/lib/catalog/catalog-types";
import { conditionLabel } from "@/lib/catalog/catalog-presentation";
import styles from "./CatalogFilters.module.css";

export type CatalogFiltersProps = {
  headingId: string;
  state: CatalogQueryState;
  optionsState:
    | { kind: "loading" }
    | { kind: "error"; onRetry: () => void }
    | { kind: "ready"; options: CatalogFilterOptionsResponse };
  actions: {
    changeFilter: (update: Partial<CatalogQueryState>) => void;
    changeCurrency: (currency: string | null) => void;
    reset: () => void;
  };
};

type PriceDraft = {
  sourceCurrency: string | null;
  sourceMinPrice: string | null;
  sourceMaxPrice: string | null;
  minPrice: string;
  maxPrice: string;
  error: string | null;
};

const PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

function createPriceDraft(state: CatalogQueryState): PriceDraft {
  return {
    sourceCurrency: state.currency,
    sourceMinPrice: state.minPrice,
    sourceMaxPrice: state.maxPrice,
    minPrice: state.minPrice ?? "",
    maxPrice: state.maxPrice ?? "",
    error: null,
  };
}

function isCurrentPriceDraft(
  draft: PriceDraft,
  state: CatalogQueryState,
): boolean {
  return (
    draft.sourceCurrency === state.currency &&
    draft.sourceMinPrice === state.minPrice &&
    draft.sourceMaxPrice === state.maxPrice
  );
}

export function CatalogFilters({
  headingId,
  state,
  optionsState,
  actions,
}: Readonly<CatalogFiltersProps>) {
  const options = optionsState.kind === "ready" ? optionsState.options : undefined;
  const priceErrorId = useId();
  const [storedPriceDraft, setPriceDraft] = useState(() =>
    createPriceDraft(state),
  );
  const priceDraft = isCurrentPriceDraft(storedPriceDraft, state)
    ? storedPriceDraft
    : createPriceDraft(state);
  const select =
    <T extends string>(handler: (value: T | null) => void) =>
      (event: ChangeEvent<HTMLSelectElement>) =>
        handler((event.target.value || null) as T | null);

  const updatePriceDraft = (update: Partial<PriceDraft>) => {
    setPriceDraft({ ...priceDraft, ...update, error: null });
  };

  const applyPriceRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minPrice = priceDraft.minPrice.trim() || null;
    const maxPrice = priceDraft.maxPrice.trim() || null;

    if (
      (minPrice && !PRICE_PATTERN.test(minPrice)) ||
      (maxPrice && !PRICE_PATTERN.test(maxPrice))
    ) {
      setPriceDraft({
        ...priceDraft,
        error: "Введіть додатну ціну, використовуючи не більше двох знаків після крапки.",
      });
      return;
    }

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setPriceDraft({
        ...priceDraft,
        error: "Мінімальна ціна не може перевищувати максимальну.",
      });
      return;
    }

    actions.changeFilter({ minPrice, maxPrice });
  };

  return (
    <aside className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h2 id={headingId}>Фільтри</h2>
        <button type="button" onClick={actions.reset}>Скинути</button>
      </div>

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

      <form className={styles.priceForm} onSubmit={applyPriceRange}>
        <div className={styles.priceFields}>
          <label className={styles.field}>
            <span>Ціна від</span>
            <input
              inputMode="decimal"
              value={priceDraft.minPrice}
              disabled={!state.currency}
              aria-invalid={Boolean(priceDraft.error)}
              aria-describedby={priceDraft.error ? priceErrorId : undefined}
              onChange={(event) =>
                updatePriceDraft({ minPrice: event.target.value })
              }
            />
          </label>
          <label className={styles.field}>
            <span>Ціна до</span>
            <input
              inputMode="decimal"
              value={priceDraft.maxPrice}
              disabled={!state.currency}
              aria-invalid={Boolean(priceDraft.error)}
              aria-describedby={priceDraft.error ? priceErrorId : undefined}
              onChange={(event) =>
                updatePriceDraft({ maxPrice: event.target.value })
              }
            />
          </label>
        </div>
        {priceDraft.error ? (
          <p id={priceErrorId} role="alert" className={styles.priceError}>
            {priceDraft.error}
          </p>
        ) : null}
        {state.currency ? (
          <p className={styles.hint}>
            Доступний діапазон: {options?.data.currencies.find(({ code }) => code === state.currency)?.minimumPrice ?? "—"}–{options?.data.currencies.find(({ code }) => code === state.currency)?.maximumPrice ?? "—"} {state.currency}
          </p>
        ) : null}
        <button
          type="submit"
          className={styles.priceSubmit}
          disabled={!state.currency}
        >
          Застосувати ціну
        </button>
      </form>

    </aside>
  );
}
