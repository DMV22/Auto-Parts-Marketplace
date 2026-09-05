import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config.js";

describe("Next.js security headers", () => {
  it("applies the public-demo baseline without introducing a strict CSP", async () => {
    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/:path*");
    const headers = Object.fromEntries(
      globalRule?.headers.map(({ key, value }) => [key, value]) ?? [],
    );

    expect(headers).toMatchObject({
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    });
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });
});
