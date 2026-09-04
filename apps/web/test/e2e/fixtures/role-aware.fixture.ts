import { randomBytes, randomUUID } from "node:crypto";
import {
  expect,
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  cleanRoleFixture,
  createForeignSupplier,
  provisionRole,
  type SupplierMembershipStatus,
  type TestUserRole,
} from "./test-database";

const APP_ORIGIN = "http://localhost:3000";

export type RoleActor = {
  context: BrowserContext;
  email: string | null;
  foreignSupplierId: string | null;
  page: Page;
  supplierId: string | null;
  userId: string | null;
};

type RoleAwareFixtures = {
  activeSupplierUser: RoleActor;
  admin: RoleActor;
  anonymous: RoleActor;
  customer: RoleActor;
  guest: RoleActor;
  inactiveSupplierUser: RoleActor;
  supportManager: RoleActor;
};

export const test = base.extend<RoleAwareFixtures>({
  anonymous: async ({ browser }, provide) => {
    const actor = await createAnonymousActor(browser);
    await provide(actor);
    await actor.context.close();
  },
  customer: async ({ browser }, provide) => {
    await withRoleActor(browser, provide, "CUSTOMER");
  },
  guest: async ({ browser }, provide) => {
    const actor = await createAnonymousActor(browser);
    await actor.page.goto("/");
    const response = await actor.context.request.get("/api/v1/cart");
    expect(response.ok()).toBe(true);
    const guestCookie = (await actor.context.cookies()).find(
      (cookie) => cookie.name === "apm_guest_cart",
    );
    expect(guestCookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });
    await provide(actor);
    await actor.context.close();
  },
  activeSupplierUser: async ({ browser }, provide) => {
    await withRoleActor(browser, provide, "SUPPLIER_USER", "ACTIVE");
  },
  inactiveSupplierUser: async ({ browser }, provide) => {
    await withRoleActor(browser, provide, "SUPPLIER_USER", "DISABLED");
  },
  supportManager: async ({ browser }, provide) => {
    await withRoleActor(browser, provide, "SUPPORT_MANAGER");
  },
  admin: async ({ browser }, provide) => {
    await withRoleActor(browser, provide, "ADMIN");
  },
});

export { expect };

async function withRoleActor(
  browser: Browser,
  provide: (actor: RoleActor) => Promise<void>,
  role: TestUserRole,
  membershipStatus?: SupplierMembershipStatus,
): Promise<void> {
  const context = await browser.newContext({ baseURL: APP_ORIGIN });
  const page = await context.newPage();
  const fixtureId = randomUUID();
  const email = `f8-${role.toLowerCase()}-${fixtureId}@example.test`;
  const password = `F8-${randomBytes(24).toString("base64url")}aA1!`;
  const supplier = membershipStatus
    ? {
        id: randomUUID(),
        membershipStatus,
        name: `F8 ${membershipStatus.toLowerCase()} supplier`,
        slug: `f8-${membershipStatus.toLowerCase()}-${fixtureId}`,
      }
    : undefined;
  const foreignSupplier = membershipStatus
    ? {
        id: randomUUID(),
        name: "F8 foreign supplier",
        slug: `f8-foreign-${fixtureId}`,
      }
    : undefined;

  try {
    const signUp = await context.request.post("/api/auth/sign-up/email", {
      data: { email, name: `F8 ${role}`, password },
    });
    expect(signUp.ok()).toBe(true);
    const { userId } = await provisionRole(email, role, supplier);
    if (foreignSupplier) await createForeignSupplier(foreignSupplier);

    await provide({
      context,
      email,
      foreignSupplierId: foreignSupplier?.id ?? null,
      page,
      supplierId: supplier?.id ?? null,
      userId,
    });
  } finally {
    await context.close();
    const supplierIds: string[] = [];
    if (supplier) supplierIds.push(supplier.id);
    if (foreignSupplier) supplierIds.push(foreignSupplier.id);
    await cleanRoleFixture({
      email,
      supplierIds,
    });
  }
}

async function createAnonymousActor(browser: Browser): Promise<RoleActor> {
  const context = await browser.newContext({ baseURL: APP_ORIGIN });
  return {
    context,
    email: null,
    foreignSupplierId: null,
    page: await context.newPage(),
    supplierId: null,
    userId: null,
  };
}
