import { expect, test } from "@playwright/test";

test("serves the accessible platform shell through Next.js", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Auto Parts Marketplace", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Перейти до основного вмісту" }),
  ).toHaveAttribute("href", "#main-content");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
});

test("proxies anonymous session and guest cart cookies to NestJS", async ({
  context,
  page,
}) => {
  await page.goto("/");

  const sessionResponse = await page.evaluate(async () => {
    const response = await fetch("/api/auth/get-session", {
      credentials: "include",
    });

    return { body: await response.json(), status: response.status };
  });
  expect(sessionResponse).toEqual({ body: null, status: 200 });

  const cartStatus = await page.evaluate(async () => {
    const response = await fetch("/api/v1/cart", {
      credentials: "include",
    });

    return response.status;
  });
  expect(cartStatus).toBe(200);

  const guestCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "apm_guest_cart",
  );

  expect(guestCookie).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
  });
  expect(guestCookie?.value).toBeTruthy();

  const browserStorage = await page.evaluate(() => ({
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
  }));

  expect(browserStorage).toEqual({
    localStorage: {},
    sessionStorage: {},
  });
});
