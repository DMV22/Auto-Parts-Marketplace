import { describe, expect, it } from "vitest";
import { parseGuardedTestDatabaseUrl } from "../e2e/fixtures/test-database-url.js";

describe("frontend E2E database guard", () => {
  it("accepts only the guarded local test database", () => {
    expect(
      parseGuardedTestDatabaseUrl(
        "postgresql://postgres:postgres@localhost:5433/auto_parts_test",
      ).pathname,
    ).toBe("/auto_parts_test");
  });

  it.each([
    "postgresql://postgres:postgres@database.example.test:5433/auto_parts_test",
    "postgresql://postgres:postgres@localhost:5433/auto_parts_dev",
    "mysql://root:root@localhost:3306/auto_parts_test",
  ])("rejects an unsafe target: %s", (value) => {
    expect(() => parseGuardedTestDatabaseUrl(value)).toThrow(
      "Frontend E2E requires a local TEST_DATABASE_URL targeting auto_parts_test",
    );
  });
});
