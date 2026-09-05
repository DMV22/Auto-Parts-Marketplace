import { z } from "zod";
import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import { safeReturnTo } from "./auth-navigation";
import {
  createAccountPasswordSchema,
  signInSchema,
  signUpSchema,
  type CreateAccountPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "./auth-schemas";

const socialSignInResponseSchema = z.object({
  redirect: z.literal(true),
  url: z.url(),
});

const linkedAuthAccountsSchema = z.array(
  z.object({
    id: z.string(),
    providerId: z.string(),
  }),
);

const linkSocialResponseSchema = z.discriminatedUnion("redirect", [
  socialSignInResponseSchema,
  z.object({
    redirect: z.literal(false),
    status: z.literal(true),
    url: z.string().optional(),
  }),
]);

const createPasswordResponseSchema = z.object({
  status: z.literal(true),
});

export type LinkedAuthAccount = z.infer<
  typeof linkedAuthAccountsSchema
>[number];

function secureAuthorizationUrl(url: string): string {
  const authorizationUrl = new URL(url);

  if (authorizationUrl.protocol !== "https:") {
    throw new AppError("The Google authorization URL is not secure", {
      kind: "invalid_response",
    });
  }

  return authorizationUrl.toString();
}

function googleSignInErrorCallback(returnTo?: string | null): string {
  const parameters = new URLSearchParams({
    returnTo: safeReturnTo(returnTo),
  });

  return `/sign-in?${parameters.toString()}`;
}

export async function signUpWithEmail(input: SignUpInput): Promise<void> {
  const payload = signUpSchema.parse(input);

  await apiRequest<unknown>("/api/auth/sign-up/email", {
    body: payload,
    method: "POST",
  });
}

export async function signInWithEmail(input: SignInInput): Promise<void> {
  const payload = signInSchema.parse(input);

  await apiRequest<unknown>("/api/auth/sign-in/email", {
    body: payload,
    method: "POST",
  });
}

export async function signInWithGoogle(returnTo?: string | null): Promise<string> {
  const payload = await apiRequest<unknown>("/api/auth/sign-in/social", {
    body: {
      callbackURL: safeReturnTo(returnTo),
      errorCallbackURL: googleSignInErrorCallback(returnTo),
      provider: "google",
    },
    method: "POST",
  });
  const result = socialSignInResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError("The Google sign-in response does not match its contract", {
      kind: "invalid_response",
      details: result.error.flatten(),
    });
  }

  return secureAuthorizationUrl(result.data.url);
}

export async function getLinkedAuthAccounts(
  signal?: AbortSignal,
): Promise<LinkedAuthAccount[]> {
  const payload = await apiRequest<unknown>("/api/auth/list-accounts", {
    cache: "no-store",
    signal,
  });
  const result = linkedAuthAccountsSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError(
      "The linked accounts response does not match its contract",
      {
        kind: "invalid_response",
        details: result.error.flatten(),
      },
    );
  }

  return result.data;
}

export async function linkGoogleAccount(): Promise<string | null> {
  const payload = await apiRequest<unknown>("/api/auth/link-social", {
    body: {
      callbackURL: "/account/security?linked=google",
      errorCallbackURL: "/account/security?linkError=google",
      provider: "google",
    },
    method: "POST",
  });
  const result = linkSocialResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError(
      "The account-linking response does not match its contract",
      {
        kind: "invalid_response",
        details: result.error.flatten(),
      },
    );
  }

  return result.data.redirect
    ? secureAuthorizationUrl(result.data.url)
    : null;
}

export async function createAccountPassword(
  input: CreateAccountPasswordInput,
): Promise<void> {
  const password = createAccountPasswordSchema.parse(input);
  const payload = await apiRequest<unknown>("/api/v1/me/password", {
    body: { newPassword: password.newPassword },
    method: "POST",
  });
  const result = createPasswordResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError(
      "The create-password response does not match its contract",
      {
        kind: "invalid_response",
        details: result.error.flatten(),
      },
    );
  }
}

export async function signOut(): Promise<void> {
  await apiRequest<unknown>("/api/auth/sign-out", { method: "POST" });
}
