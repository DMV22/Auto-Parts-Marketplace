import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

const webDirectory = fileURLToPath(new URL("../../..", import.meta.url));

export type LighthouseAuditResult = {
  accessibility: number;
  bestPractices: number;
  cumulativeLayoutShift: number;
  label: string;
  largestContentfulPaint: number;
  output: string;
  passed: boolean;
  performance: number;
  runs: number;
};

export async function runLighthouseAudit(input: {
  label: string;
  sessionCookie?: string;
  url: string;
}): Promise<LighthouseAuditResult> {
  // The package-manager executable is supplied by pnpm to this test-only runner.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const pnpmCli = process.env.npm_execpath;

  if (!pnpmCli) {
    throw new Error("pnpm CLI path is unavailable in npm_execpath");
  }

  const result = spawnSync(
    process.execPath,
    [pnpmCli, "exec", "lhci", "autorun", "--config=lighthouserc.cjs"],
    {
      cwd: webDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        LHCI_OUTPUT_DIRECTORY: `.lighthouseci/${input.label}`,
        ...(input.sessionCookie
          ? { LHCI_SESSION_COOKIE: input.sessionCookie }
          : {}),
        LHCI_TARGET_URL: input.url,
      },
      // Three throttled runs stay below the five-minute command budget while
      // producing a stable median instead of a noisy single sample.
      timeout: 240_000,
    },
  );
  const output = redactCookie(
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    input.sessionCookie,
  );

  if (result.error) throw new Error(output, { cause: result.error });

  const manifestPath = `${webDirectory}/.lighthouseci/${input.label}/manifest.json`;
  if (!existsSync(manifestPath)) {
    throw new Error(
      output || `Lighthouse did not emit a manifest for ${input.label}`,
    );
  }

  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as Array<{
    htmlPath: string;
    jsonPath: string;
    summary: {
      accessibility: number;
      "best-practices": number;
      performance: number;
    };
  }>;
  if (manifest.length === 0) {
    throw new Error(`Lighthouse did not emit a report for ${input.label}`);
  }

  const sensitiveValues = input.sessionCookie
    ? input.sessionCookie
        .split("; ")
        .map((pair) => pair.slice(pair.indexOf("=") + 1))
        .filter(Boolean)
    : [];
  const reports = manifest.map((entry) => {
    const rawReport = readFileSync(entry.jsonPath, "utf8");
    const rawHtmlReport = readFileSync(entry.htmlPath, "utf8");
    if (
      sensitiveValues.some(
        (value) => rawReport.includes(value) || rawHtmlReport.includes(value),
      )
    ) {
      removeSensitiveReportDirectory(input.label);
      throw new Error(`Lighthouse report leaked the ${input.label} session cookie`);
    }

    return JSON.parse(rawReport) as {
      audits: {
        "cumulative-layout-shift": { numericValue: number };
        "largest-contentful-paint": { numericValue: number };
      };
    };
  });

  const reportMetric = (
    select: (report: (typeof reports)[number]) => number,
  ) => median(reports.map(select));
  const summaryMetric = (
    select: (entry: (typeof manifest)[number]) => number,
  ) => median(manifest.map(select));

  return {
    accessibility: summaryMetric((entry) => entry.summary.accessibility),
    bestPractices: summaryMetric(
      (entry) => entry.summary["best-practices"],
    ),
    cumulativeLayoutShift: reportMetric(
      (report) => report.audits["cumulative-layout-shift"].numericValue,
    ),
    label: input.label,
    largestContentfulPaint: reportMetric(
      (report) => report.audits["largest-contentful-paint"].numericValue,
    ),
    output,
    passed: result.status === 0,
    performance: summaryMetric((entry) => entry.summary.performance),
    runs: manifest.length,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function removeSensitiveReportDirectory(label: string): void {
  const reportsRoot = resolve(webDirectory, ".lighthouseci");
  const reportDirectory = resolve(reportsRoot, label);
  if (!reportDirectory.startsWith(`${reportsRoot}${sep}`)) {
    throw new Error("Refusing to remove a Lighthouse report outside its root");
  }
  rmSync(reportDirectory, { force: true, recursive: true });
}

export async function readSessionCookie(
  context: BrowserContext,
  url: string,
): Promise<string | undefined> {
  const cookies = await context.cookies(url);
  if (cookies.length === 0) return undefined;
  return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

function redactCookie(output: string, cookie: string | undefined): string {
  return cookie ? output.replaceAll(cookie, "[REDACTED SESSION COOKIE]") : output;
}
