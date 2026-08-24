import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import { expectedApiErrorFixture } from "../fixtures/errors";
import { mockApi } from "../mocks/server";

describe("apiRequest", () => {
  it("returns JSON through the public API boundary with cookie credentials", async () => {
    mockApi.use(
      http.get("*/api/v1/status", ({ request }) => {
        expect(request.credentials).toBe("include");
        return HttpResponse.json({ status: "ok" });
      }),
    );

    await expect(
      apiRequest<{ status: string }>("/api/v1/status"),
    ).resolves.toEqual({ status: "ok" });
  });

  it.each([
    [400, "validation"],
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [503, "unavailable"],
  ] as const)("normalizes an HTTP %i response as %s", async (status, kind) => {
    mockApi.use(
      http.get("*/api/v1/failure", () =>
        HttpResponse.json(
          expectedApiErrorFixture,
          { status },
        ),
      ),
    );

    const request = apiRequest("/api/v1/failure");

    await expect(request).rejects.toMatchObject({
      code: "EXPECTED_ERROR",
      kind,
      message: "Expected failure",
      status,
    } satisfies Partial<AppError>);
  });

  it("rejects paths outside the agreed API namespaces", async () => {
    await expect(apiRequest("/catalog/products")).rejects.toThrow(
      "API paths must start with /api/",
    );
  });

  it("reports an aborted request without converting it to a network failure", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      apiRequest("/api/v1/status", { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: "aborted" } satisfies Partial<AppError>);
  });
});
