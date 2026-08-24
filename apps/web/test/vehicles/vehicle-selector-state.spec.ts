import { describe, expect, it } from "vitest";
import {
  createEmptyVehicleSelection,
  updateVehicleSelection,
} from "@/lib/vehicles/vehicle-selector-state";

describe("vehicle selector state", () => {
  it("clears every downstream value when the year changes", () => {
    const selection = {
      year: 2020,
      makeId: "make-a",
      modelId: "model-a",
      generationId: "generation-a",
      engineTypeId: "engine-a",
    };

    expect(updateVehicleSelection(selection, "year", 2021)).toEqual({
      year: 2021,
      makeId: null,
      modelId: null,
      generationId: null,
      engineTypeId: null,
    });
  });

  it("preserves upstream values and clears only generation and engine after a model change", () => {
    const selection = {
      year: 2020,
      makeId: "make-a",
      modelId: "model-a",
      generationId: "generation-a",
      engineTypeId: "engine-a",
    };

    expect(updateVehicleSelection(selection, "modelId", "model-b")).toEqual({
      year: 2020,
      makeId: "make-a",
      modelId: "model-b",
      generationId: null,
      engineTypeId: null,
    });
    expect(createEmptyVehicleSelection()).toEqual({
      year: null,
      makeId: null,
      modelId: null,
      generationId: null,
      engineTypeId: null,
    });
  });
});
