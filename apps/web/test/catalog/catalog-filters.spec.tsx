import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogAppliedFilters } from "@/components/catalog/CatalogAppliedFilters";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { defaultCatalogQuery } from "@/lib/catalog/catalog-query";

const optionsState = {
  kind: "ready" as const,
  options: {
    data: {
      brands: [],
      categories: [],
      currencies: [
        { code: "EUR", minimumPrice: "22", maximumPrice: "449" },
      ],
    },
    meta: { truncated: false },
  },
};

describe("Catalog price filters", () => {
  it("keeps the committed minimum while the user enters and applies a maximum", () => {
    const changeFilter = vi.fn();

    render(
      <CatalogFilters
        headingId="catalog-filters"
        state={{
          ...defaultCatalogQuery,
          currency: "EUR",
          minPrice: "201",
        }}
        optionsState={optionsState}
        actions={{
          changeFilter,
          changeCurrency: vi.fn(),
          reset: vi.fn(),
        }}
      />,
    );

    const minimum = screen.getByRole("textbox", { name: "Ціна від" });
    const maximum = screen.getByRole("textbox", { name: "Ціна до" });

    fireEvent.change(maximum, { target: { value: "3" } });
    expect(minimum).toHaveValue("201");
    expect(maximum).toHaveValue("3");
    expect(changeFilter).not.toHaveBeenCalled();

    fireEvent.change(maximum, { target: { value: "302" } });
    fireEvent.click(screen.getByRole("button", { name: "Застосувати ціну" }));

    expect(changeFilter).toHaveBeenCalledOnce();
    expect(changeFilter).toHaveBeenCalledWith({
      minPrice: "201",
      maxPrice: "302",
    });
  });

  it("describes a maximum-only filter without implying a zero minimum", () => {
    render(
      <CatalogAppliedFilters
        state={{
          ...defaultCatalogQuery,
          currency: "EUR",
          maxPrice: "302",
        }}
        onSearchChange={vi.fn()}
        onChange={vi.fn()}
        onCurrencyChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Прибрати фільтр: Ціна до 302 EUR",
      }),
    ).toBeVisible();
  });
});
