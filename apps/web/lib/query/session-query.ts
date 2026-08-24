import { queryOptions } from "@tanstack/react-query";
import { getCurrentSession } from "@/lib/auth/session";
import { queryKeys } from "./query-keys";

export function sessionQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.auth.session,
    queryFn: ({ signal }) => getCurrentSession({ signal }),
  });
}
