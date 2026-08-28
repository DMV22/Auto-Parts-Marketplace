import { z } from "zod";
import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";

const userRoleSchema = z.enum([
  "CUSTOMER",
  "SUPPLIER_USER",
  "SUPPORT_MANAGER",
  "ADMIN",
]);

const sessionSchema = z.object({
  session: z.object({
    id: z.string(),
    userId: z.string(),
    expiresAt: z.string(),
  }),
  user: z.object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
    role: userRoleSchema,
    isActive: z.boolean(),
  }),
});

export type AuthSession = z.infer<typeof sessionSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;

export type CurrentSessionOptions = {
  baseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export async function getCurrentSession(
  options: CurrentSessionOptions = {},
): Promise<AuthSession | null> {
  const payload = await apiRequest<unknown>("/api/auth/get-session", {
    ...options,
    cache: "no-store",
  });

  if (payload === null) {
    return null;
  }

  const result = sessionSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError("The session response does not match its contract", {
      kind: "invalid_response",
      details: result.error.flatten(),
    });
  }

  return result.data;
}
