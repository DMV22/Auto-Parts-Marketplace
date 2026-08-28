import type { CatalogResponse } from "@/lib/catalog/catalog-types";
import { ProductCard } from "./ProductCard";
import styles from "./CatalogPage.module.css";

export type CatalogResultsModel =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty"; response: CatalogResponse }
  | { kind: "ready"; response: CatalogResponse };

type Props = {
  model: CatalogResultsModel;
  onRetry: () => void;
  onReset: () => void;
  onPageChange: (page: number) => void;
};

export function CatalogResults({
  model,
  onRetry,
  onReset,
  onPageChange,
}: Readonly<Props>) {
  const response =
    model.kind === "empty" || model.kind === "ready" ? model.response : null;

  return (
    <section className={styles.results} aria-labelledby="catalog-results">
      <div className={styles.resultsHeading}>
        <h2 id="catalog-results">Результати</h2>
        {response ? <p>{response.meta.total} товарів</p> : null}
      </div>

      {model.kind === "loading" ? (
        <p role="status" className={styles.state}>Завантажуємо каталог…</p>
      ) : model.kind === "error" ? (
        <div role="alert" className={styles.state}>
          <p>Не вдалося завантажити каталог.</p>
          <button type="button" onClick={onRetry}>Спробувати ще раз</button>
          <button type="button" onClick={onReset}>Скинути фільтри</button>
        </div>
      ) : model.kind === "empty" ? (
        <div className={styles.state}>
          <p>За цими параметрами товарів не знайдено.</p>
          <button type="button" onClick={onReset}>Скинути фільтри</button>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {model.response.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <nav className={styles.pagination} aria-label="Сторінки каталогу">
            <button
              type="button"
              disabled={model.response.meta.page <= 1}
              onClick={() => onPageChange(model.response.meta.page - 1)}
            >
              Попередня
            </button>
            <span>
              Сторінка {model.response.meta.page} з {model.response.meta.totalPages}
            </span>
            <button
              type="button"
              disabled={
                model.response.meta.totalPages === 0 ||
                model.response.meta.page >= model.response.meta.totalPages
              }
              onClick={() => onPageChange(model.response.meta.page + 1)}
            >
              Наступна
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
