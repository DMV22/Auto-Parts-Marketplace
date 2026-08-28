import type { AuthSession } from "@/lib/auth/session";

export type CartOwnerKey = "guest" | `customer:${string}`;

export type CartAccess =
  | { allowed: true; ownerKey: CartOwnerKey }
  | { allowed: false; ownerKey: null };

export function resolveCartAccess(session: AuthSession | null): CartAccess {
  if (session?.user.isActive && session.user.role !== "CUSTOMER") {
    return { allowed: false, ownerKey: null };
  }

  if (session?.user.isActive && session.user.role === "CUSTOMER") {
    return { allowed: true, ownerKey: `customer:${session.user.id}` };
  }

  return { allowed: true, ownerKey: "guest" };
}
