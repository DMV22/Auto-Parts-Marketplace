import { queryOptions } from "@tanstack/react-query";
import { getLinkedAuthAccounts } from "@/lib/auth/auth-api";
import { getCurrentSession } from "@/lib/auth/session";
import { queryKeys } from "./query-keys";

export function sessionQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.auth.session,
    queryFn: ({ signal }) => getCurrentSession({ signal }),
  });
}

export function linkedAuthAccountsQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: queryKeys.auth.accounts,
    queryFn: ({ signal }) => getLinkedAuthAccounts(signal),
    enabled,
    staleTime: 30_000,
  });
}
