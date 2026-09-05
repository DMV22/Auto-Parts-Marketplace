import { expect, test } from "./fixtures/mutation-aware.fixture";
import {
  readSessionCookie,
  runLighthouseAudit,
} from "./fixtures/lighthouse-audit";

test.setTimeout(290_000);

test("meets the mobile Lighthouse budgets on representative public routes", async ({
  activeSupplierUser,
  admin,
  anonymous,
  customer,
  marketplaceScenario,
  supportManager,
}) => {
  const appOrigin = "http://localhost:3000";
  // Lighthouse launches its own throttled Chrome. Closing fixture pages first
  // avoids measuring contention from five unrelated Playwright contexts.
  await Promise.all(
    [
      activeSupplierUser,
      admin,
      anonymous,
      customer,
      supportManager,
    ].map((actor) => actor.context.close()),
  );

  const audits = [
    { label: "home", path: "/" },
    { label: "catalog", path: "/catalog" },
    {
      label: "pdp",
      path: `/products/${marketplaceScenario.productId}`,
    },
  ];

  const results = [];
  for (const audit of audits) {
    results.push(await runLighthouseAudit({
      label: audit.label,
      url: new URL(audit.path, appOrigin).toString(),
    }));
  }

  expect(
    results.filter((result) => !result.passed).map((result) => ({
      accessibility: result.accessibility,
      bestPractices: result.bestPractices,
      cumulativeLayoutShift: Math.round(result.cumulativeLayoutShift * 1000) / 1000,
      label: result.label,
      largestContentfulPaint:
        Math.round(result.largestContentfulPaint),
      performance: result.performance,
    })),
    results.map((result) => result.output).join("\n\n"),
  ).toEqual([]);
});

test("meets the mobile Lighthouse budgets on authenticated workspace routes", async ({
  activeSupplierUser,
  admin,
  anonymous,
  customer,
  supportManager,
}) => {
  const appOrigin = "http://localhost:3000";
  const supplierSessionCookie = await readSessionCookie(
    activeSupplierUser.context,
    appOrigin,
  );
  const supportSessionCookie = await readSessionCookie(
    supportManager.context,
    appOrigin,
  );

  await Promise.all(
    [
      activeSupplierUser,
      admin,
      anonymous,
      customer,
      supportManager,
    ].map((actor) => actor.context.close()),
  );

  const audits = [
    {
      label: "supplier-listings",
      path: `/supplier/${activeSupplierUser.supplierId}/listings`,
      sessionCookie: supplierSessionCookie,
    },
    {
      label: "internal-orders",
      path: "/internal/orders",
      sessionCookie: supportSessionCookie,
    },
  ];

  const results = [];
  for (const audit of audits) {
    results.push(
      await runLighthouseAudit({
        label: audit.label,
        sessionCookie: audit.sessionCookie,
        url: new URL(audit.path, appOrigin).toString(),
      }),
    );
  }

  expect(
    results.filter((result) => !result.passed).map((result) => ({
      accessibility: result.accessibility,
      bestPractices: result.bestPractices,
      cumulativeLayoutShift:
        Math.round(result.cumulativeLayoutShift * 1000) / 1000,
      label: result.label,
      largestContentfulPaint: Math.round(result.largestContentfulPaint),
      performance: result.performance,
    })),
    results.map((result) => result.output).join("\n\n"),
  ).toEqual([]);
});
