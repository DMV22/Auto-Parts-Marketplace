import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/auth/auth-navigation";

describe("safeReturnTo", () => {
  it.each([null, "", "https://evil.example", "//evil.example", "/sign-in"])(
    "falls back to the public home for unsafe destination %s",
    (destination) => {
      expect(safeReturnTo(destination)).toBe("/");
    },
  );

  it("preserves a same-origin relative path with query and hash", () => {
    expect(safeReturnTo("/garage?from=auth#active")).toBe(
      "/garage?from=auth#active",
    );
  });
});
