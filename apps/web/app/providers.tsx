"use client";

import {
  HydrationBoundary,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { createQueryClient } from "@/lib/query/query-client";

export function AppProviders({
  children,
  sessionState,
}: Readonly<{ children: ReactNode; sessionState?: DehydratedState }>) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={sessionState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
