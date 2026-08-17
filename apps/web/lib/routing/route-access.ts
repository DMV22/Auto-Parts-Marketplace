import type { UserRole } from "@/lib/auth/session";

export type FrontendRouteGroup =
  | "public"
  | "customer"
  | "supplier"
  | "internal"
  | "admin";

export const routeAccess = {
  public: null,
  customer: ["CUSTOMER"],
  supplier: ["SUPPLIER_USER", "ADMIN"],
  internal: ["SUPPORT_MANAGER", "ADMIN"],
  admin: ["ADMIN"],
} as const satisfies Record<FrontendRouteGroup, readonly UserRole[] | null>;

export function isRouteVisibleForRole(
  group: FrontendRouteGroup,
  role: UserRole | null,
): boolean {
  const allowedRoles = routeAccess[group];

  if (allowedRoles === null) {
    return true;
  }

  return (
    role !== null && (allowedRoles as readonly UserRole[]).includes(role)
  );
}
