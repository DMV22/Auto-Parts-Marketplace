import { z } from "zod";
import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import { safeReturnTo } from "./auth-navigation";
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from "./auth-schemas";

const socialSignInResponseSchema = z.object({
  redirect: z.literal(true),
  url: z.url(),
});

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

  const authorizationUrl = new URL(result.data.url);

  if (authorizationUrl.protocol !== "https:") {
    throw new AppError("The Google authorization URL is not secure", {
      kind: "invalid_response",
    });
  }

  return authorizationUrl.toString();
}

export async function signOut(): Promise<void> {
  await apiRequest<unknown>("/api/auth/sign-out", { method: "POST" });
}
