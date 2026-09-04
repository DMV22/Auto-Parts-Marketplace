import { randomUUID } from "node:crypto";
import {
  createScenarioReturnRequest,
  simulateConcurrentStockUpdate,
} from "./fixtures/test-database";
import { expect, test } from "./fixtures/mutation-aware.fixture";

test("persists Garage mutations and projects the active vehicle into PDP fitment", async ({
  customer,
  marketplaceScenario,
}) => {
  const page = customer.page;
  await page.goto("/garage");
  await page.getByRole("button", { name: "Додати автомобіль" }).click();
  await page.getByLabel("Рік").selectOption(String(marketplaceScenario.vehicleYear));
  await page.getByLabel("Марка").selectOption({ label: marketplaceScenario.makeName });
  await page.getByLabel("Модель").selectOption({ label: marketplaceScenario.modelName });
  await page.getByLabel("Покоління").selectOption(marketplaceScenario.generationId);
  await page.getByLabel("Двигун").selectOption(marketplaceScenario.engineTypeId);
  await page.getByLabel("Назва в гаражі").fill("F8 secondary vehicle");
  await page.getByRole("button", { name: "Зберегти автомобіль" }).click();

  const secondaryVehicle = page.getByRole("article", {
    name: new RegExp(`${marketplaceScenario.makeName} ${marketplaceScenario.modelName}`),
  }).filter({ hasText: "F8 secondary vehicle" });
  await expect(secondaryVehicle).toBeVisible();
  await secondaryVehicle.getByRole("button", { name: "Зробити активним" }).click();
  await expect(secondaryVehicle.getByText("Активне авто")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("article").filter({ hasText: "F8 secondary vehicle" }).getByText("Активне авто"),
  ).toBeVisible();
  await page.goto(`/products/${marketplaceScenario.productId}`);
  await expect(page.getByText("Сумісна", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Є правило сумісності саме для вибраного двигуна."),
  ).toBeVisible();

  await page.goto("/garage");
  const activeVehicle = page
    .getByRole("article")
    .filter({ hasText: "F8 secondary vehicle" });
  await activeVehicle.getByRole("button", { name: "Видалити" }).click();
  await activeVehicle.getByRole("button", { name: "Так, видалити" }).click();
  await expect(activeVehicle).toBeHidden();
  await expect(page.getByText("1 у гаражі")).toBeVisible();
});

test("keeps a Guest Cart in the server-issued cookie across mutations and reload", async ({
  guest,
  marketplaceScenario,
}) => {
  const page = guest.page;
  await page.goto(`/products/${marketplaceScenario.productId}`);
  await page.getByRole("button", { name: "Додати в кошик" }).click();
  await expect(page.getByText("Додано до кошика")).toBeVisible();

  await page.goto("/cart");
  await page
    .getByRole("button", { name: `Збільшити кількість ${marketplaceScenario.productName}` })
    .click();
  await expect(
    page.getByLabel(`Кількість ${marketplaceScenario.productName}`, {
      exact: true,
    }),
  ).toContainText("2");
  await page.reload();
  await expect(
    page.getByLabel(`Кількість ${marketplaceScenario.productName}`, {
      exact: true,
    }),
  ).toContainText("2");
  await page
    .getByRole("button", { name: `Видалити ${marketplaceScenario.productName} з кошика` })
    .click();
  await expect(page.getByRole("heading", { name: "Кошик порожній" })).toBeVisible();
});

test("uses one ephemeral checkout request and recovers the server-owned pending Order", async ({
  customer,
  marketplaceScenario,
}) => {
  const page = customer.page;
  await page.goto(`/products/${marketplaceScenario.productId}`);
  await page.getByRole("button", { name: "Додати в кошик" }).click();
  await page.goto("/cart");

  let requestCount = 0;
  let idempotencyKey: string | undefined;
  await page.route("**/api/v1/checkout/session", async (route) => {
    requestCount += 1;
    idempotencyKey = route.request().headers()["idempotency-key"];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          orderId: marketplaceScenario.pendingOrderId,
          status: "PENDING_PAYMENT",
          currency: "UAH",
          totalAmount: "459.00",
          checkoutExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          checkoutSession: {
            id: `cs_test_${randomUUID()}`,
            url: `http://localhost:3000/checkout/cancel?orderId=${marketplaceScenario.pendingOrderId}`,
          },
        },
      }),
    });
  });

  await Promise.all([
    page.waitForURL(/\/checkout\/cancel\?orderId=/),
    page.getByRole("main").getByRole("button", { name: "Перейти до оплати" }).click(),
  ]);
  expect(requestCount).toBe(1);
  expect(idempotencyKey).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  await expect(page.getByRole("heading", { name: "Checkout не завершено" })).toBeVisible();
  await expect(page.getByText("PENDING PAYMENT")).toBeVisible();
});

test("creates and cancels a Customer return from an immutable delivered OrderItem", async ({
  customer,
  marketplaceScenario,
}) => {
  const page = customer.page;
  await page.goto(`/orders/${marketplaceScenario.deliveredOrderId}`);
  await page.getByLabel("Причина повернення").fill("F8 deterministic return reason");
  await page.getByRole("button", { name: "Створити запит" }).click();
  await expect(page.getByText("Запит на повернення створено.")).toBeVisible();
  await expect(page.getByText("F8 deterministic return reason")).toBeVisible();
  await page.getByRole("button", { name: "Скасувати запит" }).click();
  await expect(page.getByText("Запит на повернення скасовано.")).toBeVisible();
  await expect(page.getByText("Скасовано", { exact: true })).toBeVisible();
});

test("submits a Listing and recovers a stale inventory write through refetch and retry", async ({
  activeSupplierUser,
  marketplaceScenario,
}) => {
  const page = activeSupplierUser.page;
  const supplierId = activeSupplierUser.supplierId!;

  await page.goto(`/supplier/${supplierId}/listings/${marketplaceScenario.draftListingId}`);
  await page.getByRole("button", { name: "Надіслати на перевірку" }).click();
  await expect(page.getByText("Очікує перевірки", { exact: true })).toBeVisible();

  await page.goto(`/supplier/${supplierId}/listings/${marketplaceScenario.activeListingId}`);
  await expect(page.getByText("Актуальний залишок: 5; версія: 0")).toBeVisible();
  await page.getByLabel("Кількість").fill("9");
  await simulateConcurrentStockUpdate(marketplaceScenario.activeListingId, 7);
  await page.getByRole("button", { name: "Зберегти", exact: true }).click();
  await expect(
    page.getByText("Залишок уже змінився в іншій операції."),
  ).toBeVisible();
  await expect(page.getByText("Актуальний залишок: 7; версія: 1")).toBeVisible();
  await page.getByRole("button", { name: "Повторити" }).click();
  await expect(page.getByText("Актуальний залишок: 9; версія: 2")).toBeVisible();
});

test("applies Internal Ops and Admin mutations without leaking moderation state to public offers", async ({
  activeSupplierUser,
  admin,
  customer,
  marketplaceScenario,
  supportManager,
}) => {
  const returnRequestId = await createScenarioReturnRequest({
    customerUserId: customer.userId!,
    orderItemId: marketplaceScenario.deliveredOrderItemId,
  });

  await supportManager.page.goto(`/internal/orders/${marketplaceScenario.paidOrderId}`);
  await supportManager.page
    .getByRole("button", { name: "Перевести в «Опрацьовується»" })
    .click();
  await expect(supportManager.page.getByText("Статус підтверджено backend response.")).toBeVisible();
  await supportManager.page.getByLabel("Нова internal note").fill("F8 support note");
  await supportManager.page.getByRole("button", { name: "Додати note" }).click();
  await expect(supportManager.page.getByText("F8 support note")).toBeVisible();

  await supportManager.page.goto(`/internal/returns/${returnRequestId}`);
  await supportManager.page.getByLabel("Наступний статус").selectOption("UNDER_REVIEW");
  await supportManager.page.getByRole("button", { name: "Підтвердити transition" }).click();
  await expect(supportManager.page.getByText("Transition підтверджено backend response.")).toBeVisible();
  await expect(supportManager.page.getByText("На розгляді", { exact: true })).toBeVisible();

  await admin.page.goto(
    `/admin/moderation?status=PENDING_APPROVAL&supplierId=${activeSupplierUser.supplierId}`,
  );
  await admin.page.getByRole("button", { name: "Reject…" }).click();
  await admin.page
    .getByLabel("Supplier-visible rejection reason")
    .fill("F8 rejected by deterministic moderation");
  await admin.page.getByRole("button", { name: "Підтвердити reject" }).click();
  await expect(admin.page.getByText("Listings за цими фільтрами відсутні.")).toBeVisible();

  await admin.page.goto(
    `/admin/moderation?status=ACTIVE&supplierId=${activeSupplierUser.supplierId}`,
  );
  await admin.page.getByRole("button", { name: "Emergency pause…" }).click();
  await admin.page
    .getByLabel("Supplier-visible pause reason")
    .fill("F8 emergency pause reason");
  await admin.page.getByRole("button", { name: "Підтвердити pause" }).click();
  await expect(admin.page.getByText("Listings за цими фільтрами відсутні.")).toBeVisible();

  await activeSupplierUser.page.goto(
    `/supplier/${activeSupplierUser.supplierId}/listings/${marketplaceScenario.activeListingId}`,
  );
  await expect(
    activeSupplierUser.page.getByText("Призупинено Admin: F8 emergency pause reason"),
  ).toBeVisible();

  await admin.page.goto(`/products/${marketplaceScenario.productId}`);
  await expect(
    admin.page.getByRole("heading", { name: "Не вдалося відкрити товар" }),
  ).toBeVisible();
});
