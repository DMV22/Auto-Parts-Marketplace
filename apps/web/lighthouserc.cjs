"use strict";
/* eslint-disable no-undef, turbo/no-undeclared-env-vars -- Node-owned local quality-gate config. */

const targetUrl = process.env.LHCI_TARGET_URL;
const sessionCookie = process.env.LHCI_SESSION_COOKIE;
const outputDirectory = process.env.LHCI_OUTPUT_DIRECTORY;
const numberOfRuns = Number.parseInt(process.env.LHCI_NUMBER_OF_RUNS ?? "3", 10);

if (!targetUrl) {
  throw new Error("LHCI_TARGET_URL is required");
}

if (!Number.isInteger(numberOfRuns) || numberOfRuns < 1 || numberOfRuns > 3) {
  throw new Error("LHCI_NUMBER_OF_RUNS must be an integer between 1 and 3");
}

const medianRun = { aggregationMethod: "median-run" };

module.exports = {
  ci: {
    collect: {
      numberOfRuns,
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
        "categories:accessibility": [
          "error",
          { ...medianRun, minScore: 0.95 },
        ],
        "categories:best-practices": [
          "error",
          { ...medianRun, minScore: 0.9 },
        ],
        "categories:performance": [
          "error",
          { ...medianRun, minScore: 0.8 },
        ],
        "cumulative-layout-shift": [
          "error",
          { ...medianRun, maxNumericValue: 0.1 },
        ],
        "largest-contentful-paint": [
          "error",
          { ...medianRun, maxNumericValue: 2500 },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: outputDirectory ?? ".lighthouseci/report",
    },
  },
};
