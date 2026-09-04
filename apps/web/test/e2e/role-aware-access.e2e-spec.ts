import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/role-aware.fixture";

test("keeps anonymous and guest contexts server-issued and storage-free", async ({
  anonymous,
  guest,
}) => {
  await anonymous.page.goto("/garage");
  await expect(
    anonymous.page.getByRole("heading", {
      name: "Увійдіть, щоб користуватися гаражем",
    }),
  ).toBeVisible();

  await guest.page.goto("/cart");
  await expect(
    guest.page.getByRole("heading", { name: "Кошик порожній" }),
  ).toBeVisible();
  await expectBrowserStorageToBeEmpty(guest.page);
});

test("isolates Customer and Supplier workspaces by backend role and membership", async ({
  activeSupplierUser,
  customer,
  inactiveSupplierUser,
}) => {
  await customer.page.goto("/garage");
  await expect(
    customer.page.getByRole("heading", { name: "Гараж поки порожній" }),
  ).toBeVisible();

  await customer.page.goto(
    `/supplier/${activeSupplierUser.supplierId}/listings`,
  );
  await expect(
    customer.page.getByRole("heading", { name: "Доступ заборонено" }),
  ).toBeVisible();

  await activeSupplierUser.page.goto(
    `/supplier/${activeSupplierUser.supplierId}/listings`,
  );
  await expect(
    activeSupplierUser.page.getByRole("navigation", {
      name: "Кабінет постачальника",
    }),
  ).toBeVisible();

  await activeSupplierUser.page.goto(
    `/supplier/${activeSupplierUser.foreignSupplierId}/listings`,
  );
  await expect(
    activeSupplierUser.page.getByRole("heading", {
      name: "Supplier workspace недоступний",
    }),
  ).toBeVisible();

  await activeSupplierUser.page.goto(
    `/supplier/${activeSupplierUser.supplierId}/listings/00000000-0000-4000-8000-000000000099`,
  );
  await expect(
    activeSupplierUser.page.getByRole("heading", {
      name: "Оголошення недоступне",
    }),
  ).toBeVisible();

  await inactiveSupplierUser.page.goto(
    `/supplier/${inactiveSupplierUser.supplierId}/listings`,
  );
  await expect(
    inactiveSupplierUser.page.getByText("Membership постачальника вимкнено."),
  ).toBeVisible();

  await customer.page.getByRole("button", { name: "Вийти" }).click();
  await expect(
    customer.page
      .getByLabel("Основна навігація")
      .getByRole("link", { name: "Увійти" }),
  ).toBeVisible();
  await customer.page.goto("/garage");
  await expect(
    customer.page.getByRole("heading", {
      name: "Увійдіть, щоб користуватися гаражем",
    }),
  ).toBeVisible();
});

test("separates SupportManager and Admin workspaces", async ({
  admin,
  supportManager,
}) => {
  await supportManager.page.goto("/internal/orders");
  await expect(
    supportManager.page.getByRole("heading", { name: "Операційний центр" }),
  ).toBeVisible();

  await supportManager.page.goto("/admin/moderation");
  await expect(
    supportManager.page.getByRole("heading", { name: "Доступ заборонено" }),
  ).toBeVisible();

  await admin.page.goto("/admin/moderation");
  await expect(
    admin.page.getByRole("heading", { name: "Listing moderation" }),
  ).toBeVisible();
  await expectBrowserStorageToBeEmpty(admin.page);
});

async function expectBrowserStorageToBeEmpty(page: Page): Promise<void> {
  const storage = await page.evaluate(() => ({
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
  }));
  expect(storage).toEqual({ localStorage: {}, sessionStorage: {} });
}
