import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CatalogSort } from "@/lib/catalog/catalog-query";
import type { ReactNode } from "react";
import styles from "./CatalogToolbar.module.css";

type CatalogToolbarProps = {
  search: string;
  sort: CatalogSort;
  currency: string | null;
  total: number | null;
  activeFilterCount: number;
  filters: ReactNode;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: CatalogSort) => void;
};

export function CatalogToolbar({
  search,
  sort,
  currency,
  total,
  activeFilterCount,
  filters,
  onSearchChange,
  onSortChange,
}: Readonly<CatalogToolbarProps>) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <span>Пошук у каталозі</span>
        <div>
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            value={search}
            maxLength={120}
            autoComplete="off"
            spellCheck={false}
            placeholder="Назва, SKU або номер деталі"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </label>

      <label className={styles.sort}>
        <span>Сортування</span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as CatalogSort)}
        >
          <option value="newest">Спочатку нові</option>
          <option value="name_asc">Назва: А–Я</option>
          <option value="name_desc">Назва: Я–А</option>
          {currency ? <option value="price_asc">Ціна: від меншої</option> : null}
          {currency ? <option value="price_desc">Ціна: від більшої</option> : null}
        </select>
      </label>

      <p className={styles.count} aria-live="polite">
        {total === null ? "Оновлюємо результати…" : `${total} товарів`}
      </p>

      <div className={styles.mobileFilters}>
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="lg" className={styles.filterTrigger} />
            }
          >
            <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
            Фільтри
            {activeFilterCount > 0 ? (
              <span className={styles.filterCount} aria-hidden="true">
                {activeFilterCount}
              </span>
            ) : null}
          </SheetTrigger>
          <SheetContent className={styles.sheet} side="right">
            <SheetHeader>
              <SheetTitle>Фільтри каталогу</SheetTitle>
              <SheetDescription>
                Зміни одразу синхронізуються з URL і серверним каталогом.
              </SheetDescription>
            </SheetHeader>
            <div className={styles.sheetBody}>{filters}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
