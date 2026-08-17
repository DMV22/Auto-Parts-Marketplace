import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api/app-error";
import { getCurrentSession } from "@/lib/auth/session";
import {
  customerSessionProjectionFixture,
  customerSessionResponseFixture,
} from "../fixtures/auth";
import { mockApi } from "../mocks/server";

describe("getCurrentSession", () => {
  it("represents an anonymous visitor as null", async () => {
    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json(null),
      ),
    );

    await expect(getCurrentSession()).resolves.toBeNull();
  });

  it("returns only the frontend-safe session projection", async () => {
    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json(customerSessionResponseFixture),
      ),
    );

    const session = await getCurrentSession();

    expect(session).toEqual(customerSessionProjectionFixture);
    expect(session?.session).not.toHaveProperty("token");
  });

  it("rejects a response that drifts from the session contract", async () => {
    mockApi.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({ user: { id: "incomplete" } }),
      ),
    );

    await expect(getCurrentSession()).rejects.toMatchObject({
      kind: "invalid_response",
    } satisfies Partial<AppError>);
  });
});
