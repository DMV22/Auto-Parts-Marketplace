import { AppError, isAbortError } from "./app-error";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  baseUrl?: string;
};

function requestUrl(path: string, baseUrl: string): string {
  if (!path.startsWith("/api/")) {
    throw new TypeError("API paths must start with /api/");
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function responsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined);
  }

  const text = await response.text();
  return text.length > 0 ? text : undefined;
}

export async function apiRequest<T>(
  path: string,
  { body, baseUrl = "", headers: initialHeaders, ...init }: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(initialHeaders);

  headers.set("accept", "application/json");

  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(requestUrl(path, baseUrl), {
      ...init,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      headers,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new AppError("Request was aborted", {
        kind: "aborted",
        cause: error,
      });
    }

    throw new AppError("Unable to reach the API", {
      kind: "network",
      cause: error,
    });
  }

  const payload = await responsePayload(response);

  if (!response.ok) {
    throw AppError.fromResponse(response.status, payload);
  }

  return payload as T;
}
