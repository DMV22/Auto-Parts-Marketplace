import "server-only";

import { headers } from "next/headers";
import type { ApiRequestContext } from "./api-client";

const apiInternalUrl = (
  process.env.API_INTERNAL_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

new URL(apiInternalUrl);

export async function getServerApiRequestContext(): Promise<ApiRequestContext> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  return {
    baseUrl: apiInternalUrl,
    headers: cookie ? { cookie } : undefined,
  };
}
