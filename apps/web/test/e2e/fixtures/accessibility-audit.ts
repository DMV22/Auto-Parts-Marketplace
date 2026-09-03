import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

export async function expectNoWcagViolations(
  page: Page,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

  await testInfo.attach(`axe-${label}`, {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });

  expect(
    result.violations.map(({ help, id, impact, nodes }) => ({
      help,
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
    `${label} contains automatically detectable WCAG A/AA violations`,
  ).toEqual([]);
}

export async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    overflowingElements: [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          className: element.className,
          left: Math.round(bounds.left),
          right: Math.round(bounds.right),
          tagName: element.tagName,
          text: element.textContent?.trim().slice(0, 80),
        };
      })
      .filter(
        ({ left, right }) =>
          left < -1 || right > document.documentElement.clientWidth + 1,
      )
      .slice(0, 10),
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    dimensions.scrollWidth,
    JSON.stringify(dimensions.overflowingElements, null, 2),
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}
