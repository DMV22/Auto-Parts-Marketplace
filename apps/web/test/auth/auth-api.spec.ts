import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api/app-error";
import {
  createAccountPassword,
  getLinkedAuthAccounts,
  linkGoogleAccount,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from "@/lib/auth/auth-api";
import { mockApi } from "../mocks/server";

describe("Better Auth API boundary", () => {
  it("sends the allowlisted email sign-up payload", async () => {
    mockApi.use(
      http.post("*/api/auth/sign-up/email", async ({ request }) => {
        expect(await request.json()).toEqual({
          email: "new@example.test",
          name: "New Customer",
          password: "password123",
        });
        return HttpResponse.json({ user: { id: "user-id" } });
      }),
    );

    await expect(
      signUpWithEmail({
        email: " NEW@EXAMPLE.TEST ",
        name: " New Customer ",
        password: "password123",
      }),
    ).resolves.toBeUndefined();
  });

  it("sends the Better Auth email sign-in payload", async () => {
    mockApi.use(
      http.post("*/api/auth/sign-in/email", async ({ request }) => {
        expect(await request.json()).toEqual({
          email: "customer@example.test",
          password: "password123",
        });
        return HttpResponse.json({ user: { id: "user-id" } });
      }),
    );

    await expect(
      signInWithEmail({
        email: "customer@example.test",
        password: "password123",
      }),
    ).resolves.toBeUndefined();
  });

  it("returns only a validated Google authorization URL", async () => {
    mockApi.use(
      http.post("*/api/auth/sign-in/social", async ({ request }) => {
        expect(await request.json()).toEqual({
          callbackURL: "/",
          errorCallbackURL: "/sign-in?returnTo=%2F",
          provider: "google",
        });
        return HttpResponse.json({
          redirect: true,
          url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
        });
      }),
    );

    await expect(signInWithGoogle("//evil.example")).resolves.toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
    );
  });

  it("returns only the safe linked-account projection", async () => {
    mockApi.use(
      http.get("*/api/auth/list-accounts", () =>
        HttpResponse.json([
          {
            id: "account-id",
            accountId: "provider-account-id",
            userId: "user-id",
            providerId: "credential",
            accessToken: "must-not-cross-the-frontend-boundary",
          },
        ]),
      ),
    );

    await expect(getLinkedAuthAccounts()).resolves.toEqual([
      { id: "account-id", providerId: "credential" },
    ]);
  });

  it("starts explicit same-account Google linking with safe callbacks", async () => {
    mockApi.use(
      http.post("*/api/auth/link-social", async ({ request }) => {
        expect(await request.json()).toEqual({
          callbackURL: "/account/security?linked=google",
          errorCallbackURL: "/account/security?linkError=google",
          provider: "google",
        });
        return HttpResponse.json({
          redirect: true,
          url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
        });
      }),
    );

    await expect(linkGoogleAccount()).resolves.toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
    );
  });

  it("sends only the validated password to the authenticated API boundary", async () => {
    mockApi.use(
      http.post("*/api/v1/me/password", async ({ request }) => {
        expect(await request.json()).toEqual({
          newPassword: "new-password-123",
        });
        return HttpResponse.json({ status: true });
      }),
    );

    await expect(
      createAccountPassword({
        confirmPassword: "new-password-123",
        newPassword: "new-password-123",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects a malformed social sign-in response", async () => {
    mockApi.use(
      http.post("*/api/auth/sign-in/social", () =>
        HttpResponse.json({ redirect: true }),
      ),
    );

    await expect(signInWithGoogle("/")).rejects.toMatchObject({
      kind: "invalid_response",
    } satisfies Partial<AppError>);
  });

  it("signs out through the Better Auth boundary", async () => {
    mockApi.use(
      http.post("*/api/auth/sign-out", () => HttpResponse.json({ success: true })),
    );

    await expect(signOut()).resolves.toBeUndefined();
  });
});
