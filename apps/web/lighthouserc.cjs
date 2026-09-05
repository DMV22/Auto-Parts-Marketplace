"use strict";
/* eslint-disable no-undef, turbo/no-undeclared-env-vars -- Node-owned local quality-gate config. */

const targetUrl = process.env.LHCI_TARGET_URL;
const sessionCookie = process.env.LHCI_SESSION_COOKIE;
const outputDirectory = process.env.LHCI_OUTPUT_DIRECTORY;

if (!targetUrl) {
  throw new Error("LHCI_TARGET_URL is required");
}

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [targetUrl],
      settings: {
        onlyCategories: ["performance", "accessibility", "best-practices"],
      },
      ...(sessionCookie
        ? { puppeteerScript: "./test/e2e/fixtures/lighthouse-auth.cjs" }
        : undefined),
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:performance": ["error", { minScore: 0.8 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: outputDirectory ?? ".lighthouseci/report",
    },
  },
};
