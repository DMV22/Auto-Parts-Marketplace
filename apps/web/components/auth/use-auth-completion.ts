"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { safeReturnTo } from "@/lib/auth/auth-navigation";
import { sessionQueryOptions } from "@/lib/query/session-query";

export function useAuthCompletion(returnTo: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    queryClient.removeQueries();
    await queryClient.fetchQuery({
      ...sessionQueryOptions(),
      staleTime: 0,
    });
    router.replace(safeReturnTo(returnTo));
    router.refresh();
  };
}
