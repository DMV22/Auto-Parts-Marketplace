import { expectNoDocumentOverflow, expectNoWcagViolations } from "./fixtures/accessibility-audit";
import { expect, test } from "./fixtures/mutation-aware.fixture";

test("has no detectable WCAG A/AA violations in the public storefront", async ({
  anonymous,
  marketplaceScenario,
}, testInfo) => {
  const page = anonymous.page;

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoWcagViolations(page, testInfo, "home");

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { level: 2, name: marketplaceScenario.productName })).toBeVisible();
  await expectNoDocumentOverflow(page);
  await expectNoWcagViolations(page, testInfo, "catalog-mobile");

  await page.goto(`/products/${marketplaceScenario.productId}`);
  await expect(page.getByRole("heading", { level: 1, name: marketplaceScenario.productName })).toBeVisible();
  await expectNoDocumentOverflow(page);
  await expectNoWcagViolations(page, testInfo, "pdp-mobile");
});

test("has no detectable WCAG A/AA violations in Customer flows", async ({
  customer,
  marketplaceScenario,
}, testInfo) => {
  const page = customer.page;

  await page.goto("/garage");
  await expect(page.getByRole("heading", { level: 1, name: "Мій гараж" })).toBeVisible();
  await expectNoWcagViolations(page, testInfo, "customer-garage");

  await page.goto(`/orders/${marketplaceScenario.deliveredOrderId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Деталі замовлення" })).toBeVisible();
  await expectNoWcagViolations(page, testInfo, "customer-order-detail");
});

test("has no detectable WCAG A/AA violations in Supplier and Internal workspaces", async ({
  activeSupplierUser,
  admin,
  marketplaceScenario,
  supportManager,
}, testInfo) => {
  await activeSupplierUser.page.setViewportSize({ height: 844, width: 390 });
  await activeSupplierUser.page.goto(
    `/supplier/${activeSupplierUser.supplierId}/listings/${marketplaceScenario.activeListingId}`,
  );
  await expect(activeSupplierUser.page.getByText(marketplaceScenario.productName)).toBeVisible();
  await expectNoDocumentOverflow(activeSupplierUser.page);
  await expectNoWcagViolations(
    activeSupplierUser.page,
    testInfo,
    "supplier-listing-mobile",
  );

  await supportManager.page.goto(`/internal/orders/${marketplaceScenario.paidOrderId}`);
  await expect(supportManager.page.getByText(marketplaceScenario.productName)).toBeVisible();
  await expectNoWcagViolations(
    supportManager.page,
    testInfo,
    "internal-order-detail",
  );

  await admin.page.goto(
    `/admin/moderation?status=PENDING_APPROVAL&supplierId=${activeSupplierUser.supplierId}`,
  );
  await expect(
    admin.page.getByRole("heading", { level: 1, name: "Модерація оголошень" }),
  ).toBeVisible();
  await expect(
    admin.page.getByRole("button", { name: "Відхилити…" }),
  ).toBeVisible();
  await expectNoWcagViolations(admin.page, testInfo, "admin-moderation");
});
