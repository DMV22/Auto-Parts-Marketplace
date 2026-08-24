export type VehicleSelection = {
  year: number | null;
  makeId: string | null;
  modelId: string | null;
  generationId: string | null;
  engineTypeId: string | null;
};

export type VehicleSelectionField = keyof VehicleSelection;

export function createEmptyVehicleSelection(): VehicleSelection {
  return {
    year: null,
    makeId: null,
    modelId: null,
    generationId: null,
    engineTypeId: null,
  };
}

export function updateVehicleSelection<
  Field extends VehicleSelectionField,
>(
  current: VehicleSelection,
  field: Field,
  value: VehicleSelection[Field],
): VehicleSelection {
  switch (field) {
    case "year":
      return {
        ...createEmptyVehicleSelection(),
        year: value as number | null,
      };
    case "makeId":
      return {
        ...current,
        makeId: value as string | null,
        modelId: null,
        generationId: null,
        engineTypeId: null,
      };
    case "modelId":
      return {
        ...current,
        modelId: value as string | null,
        generationId: null,
        engineTypeId: null,
      };
    case "generationId":
      return {
        ...current,
        generationId: value as string | null,
        engineTypeId: null,
      };
    case "engineTypeId":
      return { ...current, engineTypeId: value as string | null };
  }
}
