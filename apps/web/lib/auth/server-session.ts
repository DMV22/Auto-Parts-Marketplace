import { dehydrate, type DehydratedState } from "@tanstack/react-query";
import { headers } from "next/headers";
import { AppError } from "@/lib/api/app-error";
import { createQueryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/query-keys";
import { getCurrentSession } from "./session";

const apiInternalUrl = (
  process.env.API_INTERNAL_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

new URL(apiInternalUrl);

export async function createSessionHydrationState(): Promise<DehydratedState> {
  const queryClient = createQueryClient();
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  try {
    const session = await getCurrentSession({
      baseUrl: apiInternalUrl,
      headers: cookie ? { cookie } : undefined,
    });

    queryClient.setQueryData(queryKeys.auth.session, session);
  } catch (error) {
    if (
      !(error instanceof AppError) ||
      !["network", "unavailable"].includes(error.kind)
    ) {
      throw error;
    }
  }

  return dehydrate(queryClient);
}
