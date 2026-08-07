export type VehicleTaxonomyCollectionResponse<T> = {
  data: T[];
};

export type VehicleMakesQuery = {
  year: number;
};

export type VehicleMakeListItem = {
  id: string;
  name: string;
};

export type VehicleModelsQuery = VehicleMakesQuery & {
  makeId: string;
};

export type VehicleModelListItem = {
  id: string;
  name: string;
};

export type VehicleGenerationsQuery = VehicleMakesQuery & {
  modelId: string;
};

export type VehicleGenerationListItem = {
  id: string;
  code: string;
  name: string | null;
  yearFrom: number;
  yearTo: number;
};

export type VehicleEnginesQuery = {
  generationId: string;
};

export type EngineTypeListItem = {
  id: string;
  code: string;
  name: string;
};

export type VehicleTaxonomyQuery =
  | VehicleMakesQuery
  | VehicleModelsQuery
  | VehicleGenerationsQuery
  | VehicleEnginesQuery;
