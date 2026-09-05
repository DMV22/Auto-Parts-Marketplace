import { expect, test } from "./fixtures/mutation-aware.fixture";
import {
  readSessionCookie,
  runLighthouseAudit,
  type LighthouseAuditResult,
} from "./fixtures/lighthouse-audit";

test.setTimeout(290_000);

const appOrigin = "http://localhost:3000";

function expectBudget(result: LighthouseAuditResult): void {
  expect(
    result.passed
      ? []
      : [
          {
            accessibility: result.accessibility,
            bestPractices: result.bestPractices,
            cumulativeLayoutShift:
              Math.round(result.cumulativeLayoutShift * 1000) / 1000,
            label: result.label,
            largestContentfulPaint: Math.round(result.largestContentfulPaint),
            performance: result.performance,
            runs: result.runs,
          },
        ],
    result.output,
  ).toEqual([]);
}

test("meets the mobile Lighthouse budgets on home", async () => {
  expectBudget(
    await runLighthouseAudit({
      label: "home",
      url: new URL("/", appOrigin).toString(),
    }),
  );
});

test("meets the mobile Lighthouse budgets on catalog", async () => {
  expectBudget(
    await runLighthouseAudit({
      label: "catalog",
      url: new URL("/catalog", appOrigin).toString(),
    }),
  );
});

test("meets the mobile Lighthouse budgets on PDP", async ({
  activeSupplierUser,
  admin,
  anonymous,
  customer,
  marketplaceScenario,
  supportManager,
}) => {
  await Promise.all(
    [activeSupplierUser, admin, anonymous, customer, supportManager].map(
      (actor) => actor.context.close(),
    ),
  );

  expectBudget(
    await runLighthouseAudit({
      label: "pdp",
      url: new URL(
        `/products/${marketplaceScenario.productId}`,
        appOrigin,
      ).toString(),
    }),
  );
});

test("meets the mobile Lighthouse budgets on Supplier Listings", async ({
  activeSupplierUser,
}) => {
  const sessionCookie = await readSessionCookie(
    activeSupplierUser.context,
    appOrigin,
  );
  await activeSupplierUser.context.close();

  expectBudget(
    await runLighthouseAudit({
      label: "supplier-listings",
      sessionCookie,
      url: new URL(
        `/supplier/${activeSupplierUser.supplierId}/listings`,
        appOrigin,
      ).toString(),
    }),
  );
});

test("meets the mobile Lighthouse budgets on Internal Orders", async ({
  supportManager,
}) => {
  const sessionCookie = await readSessionCookie(
    supportManager.context,
    appOrigin,
  );
  await supportManager.context.close();

  expectBudget(
    await runLighthouseAudit({
      label: "internal-orders",
      sessionCookie,
      url: new URL("/internal/orders", appOrigin).toString(),
    }),
  );
});
