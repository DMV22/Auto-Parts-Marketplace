"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogFilterOptionsResponse } from "@/lib/catalog/catalog-types";
import {
  defaultCatalogQuery,
  parseCatalogSearchParams,
  resolveCatalogQuery,
  serializeCatalogQuery,
  type CatalogQueryState,
  withCatalogFilter,
} from "@/lib/catalog/catalog-query";

type SearchDraft = {
  source: string;
  value: string;
};

export function useCatalogUrlState(
  options: CatalogFilterOptionsResponse | undefined,
) {
  const router = useRouter();
  const rawSearchParams = useSearchParams();
  const rawSearch = rawSearchParams.toString();
  const parsed = useMemo(
    () => parseCatalogSearchParams(new URLSearchParams(rawSearch)),
    [rawSearch],
  );
  const resolved = useMemo(
    () => resolveCatalogQuery(parsed, options),
    [options, parsed],
  );
  const canonicalSearch = resolved.searchParams.toString();
  const [draft, setDraft] = useState<SearchDraft>(() => ({
    source: resolved.state.q,
    value: resolved.state.q,
  }));
  const searchDraft =
    draft.source === resolved.state.q ? draft.value : resolved.state.q;

  const navigate = useCallback(
    (state: CatalogQueryState) => {
      const params = serializeCatalogQuery(state);
      router.replace(`/catalog${params.size ? `?${params.toString()}` : ""}`, {
        scroll: false,
      });
    },
    [router],
  );

  const setSearchDraft = useCallback(
    (value: string) => setDraft({ source: resolved.state.q, value }),
    [resolved.state.q],
  );
  const changeFilter = useCallback(
    (update: Partial<CatalogQueryState>) =>
      navigate(withCatalogFilter(resolved.state, update)),
    [navigate, resolved.state],
  );
  const changeCurrency = useCallback(
    (currency: string | null) =>
      changeFilter({
        currency,
        minPrice: null,
        maxPrice: null,
        sort: resolved.state.sort.startsWith("price_")
          ? "newest"
          : resolved.state.sort,
      }),
    [changeFilter, resolved.state.sort],
  );
  const reset = useCallback(
    () => navigate(defaultCatalogQuery),
    [navigate],
  );
  const setPage = useCallback(
    (page: number) => navigate({ ...resolved.state, page }),
    [navigate, resolved.state],
  );

  useEffect(() => {
    if (rawSearch === canonicalSearch) return;
    router.replace(`/catalog${canonicalSearch ? `?${canonicalSearch}` : ""}`, {
      scroll: false,
    });
  }, [canonicalSearch, rawSearch, router]);

  useEffect(() => {
    const normalizedDraft = searchDraft.trim();
    if (normalizedDraft === resolved.state.q) return;

    const timeout = window.setTimeout(
      () => changeFilter({ q: normalizedDraft }),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [changeFilter, resolved.state.q, searchDraft]);

  return {
    state: resolved.state,
    searchDraft,
    setSearchDraft,
    changeFilter,
    changeCurrency,
    reset,
    setPage,
    wasNormalized: resolved.wasNormalized,
  };
}
