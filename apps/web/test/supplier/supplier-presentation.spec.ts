import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api/app-error";
import {
  availableListingActions,
  listingFormError,
} from "@/lib/supplier/supplier-presentation";

describe("supplier listing presentation", () => {
  it("maps lifecycle actions without offering an Admin-paused resume", () => {
    expect(
      availableListingActions({ status: "DRAFT", moderationReason: null }),
    ).toEqual(["submit", "archive"]);
    expect(
      availableListingActions({ status: "ACTIVE", moderationReason: null }),
    ).toEqual(["pause", "archive"]);
    expect(
      availableListingActions({
        status: "PAUSED",
        moderationReason: "Safety review",
      }),
    ).toEqual(["archive"]);
  });

  it("maps backend validation, conflict and ownership errors", () => {
    expect(
      listingFormError(
        new AppError("invalid", { kind: "validation", status: 400 }),
      ),
    ).toContain("Перевірте");
    expect(
      listingFormError(
        new AppError("changed", { kind: "conflict", status: 409 }),
      ),
    ).toContain("Оновіть");
    expect(
      listingFormError(
        new AppError("forbidden", { kind: "forbidden", status: 403 }),
      ),
    ).toContain("Немає доступу");
  });
});
