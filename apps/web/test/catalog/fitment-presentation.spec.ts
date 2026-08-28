import { describe, expect, it } from "vitest";
import type { FitmentAnswer } from "@/lib/catalog/catalog-types";
import { presentFitment } from "@/lib/catalog/fitment-presentation";

describe("fitment presentation", () => {
  it("maps every backend outcome to explicit, non-guaranteeing Ukrainian copy", () => {
    const answers: FitmentAnswer[] = [
      answer("compatible", "EXACT_ENGINE_MATCH"),
      answer("incompatible", "EXACT_ENGINE_EXCLUSION"),
      answer("caution", "ENGINE_REQUIRED"),
      answer("unknown", "NO_FITMENT_DATA"),
    ];

    expect(answers.map(presentFitment)).toEqual([
      expect.objectContaining({ status: "compatible", label: "Сумісна" }),
      expect.objectContaining({ status: "incompatible", label: "Не сумісна" }),
      expect.objectContaining({ status: "caution", label: "Потрібне уточнення" }),
      {
        status: "unknown",
        label: "Сумісність не підтверджена",
        explanation: "Для цієї модифікації немає достатніх даних про сумісність.",
      },
    ]);
  });
});

function answer(
  status: FitmentAnswer["status"],
  reasonCode: FitmentAnswer["reasonCode"],
): FitmentAnswer {
  return { status, reasonCode, matchedRule: null };
}
