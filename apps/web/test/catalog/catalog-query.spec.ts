import { describe, expect, it } from "vitest";
import {
  parseCatalogSearchParams,
  resolveCatalogQuery,
  serializeCatalogQuery,
} from "@/lib/catalog/catalog-query";

describe("catalog URL state", () => {
  it("normalizes invalid and unknown values while preserving valid filters", () => {
    const parsed = parseCatalogSearchParams(
      new URLSearchParams(
        "q=brake+pad&condition=NEW&inStock=true&page=2&pageSize=500&unknown=value",
      ),
    );

    expect(parsed.state).toMatchObject({
      q: "brake pad",
      condition: "NEW",
      inStock: true,
      page: 2,
      pageSize: 20,
      sort: "newest",
    });
    expect(parsed.wasNormalized).toBe(true);
    expect(parsed.searchParams.toString()).toBe(
      "q=brake+pad&inStock=true&condition=NEW&page=2",
    );
  });

  it("serializes only documented parameters and removes price state without currency", () => {
    const parsed = parseCatalogSearchParams(
      new URLSearchParams("minPrice=100&maxPrice=500&sort=price_desc"),
    );

    expect(parsed.state).toMatchObject({
      currency: null,
      minPrice: null,
      maxPrice: null,
      sort: "newest",
    });
    expect(parsed.wasNormalized).toBe(true);

    expect(
      serializeCatalogQuery({
        ...parsed.state,
        brandId: "11111111-1111-4111-8111-111111111111",
        currency: "uah",
        minPrice: "100",
        maxPrice: "500",
        sort: "price_desc",
      }).toString(),
    ).toBe(
      "brandId=11111111-1111-4111-8111-111111111111&minPrice=100&maxPrice=500&currency=UAH&sort=price_desc",
    );
  });

  it("resolves vocabulary and the single default currency in one canonical state", () => {
    const parsed = parseCatalogSearchParams(
      new URLSearchParams(
        "brandId=11111111-1111-4111-8111-111111111111&currency=USD&minPrice=100&sort=price_asc",
      ),
    );
    const resolved = resolveCatalogQuery(parsed, {
      data: {
        brands: [],
        categories: [],
        currencies: [
          { code: "UAH", minimumPrice: "80", maximumPrice: "500" },
        ],
      },
      meta: { truncated: false },
    });

    expect(resolved.state).toMatchObject({
      brandId: null,
      currency: "UAH",
      minPrice: null,
      sort: "newest",
    });
    expect(resolved.searchParams.toString()).toBe("currency=UAH");
    expect(resolved.wasNormalized).toBe(true);
  });
});
