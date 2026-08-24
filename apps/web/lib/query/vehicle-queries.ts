import { queryOptions } from "@tanstack/react-query";
import {
  getEngineTypes,
  getVehicleGenerations,
  getVehicleMakes,
  getVehicleModels,
  getVehicleYears,
} from "@/lib/vehicles/vehicle-api";
import { queryKeys } from "./query-keys";

export function vehicleYearsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.vehicles.taxonomy.years,
    queryFn: ({ signal }) => getVehicleYears(signal),
  });
}

export function vehicleMakesQueryOptions(year: number | null) {
  return queryOptions({
    queryKey: queryKeys.vehicles.taxonomy.makes(year ?? 0),
    queryFn: ({ signal }) => getVehicleMakes(year!, signal),
    enabled: year !== null,
  });
}

export function vehicleModelsQueryOptions(
  year: number | null,
  makeId: string | null,
) {
  return queryOptions({
    queryKey: queryKeys.vehicles.taxonomy.models(year ?? 0, makeId ?? ""),
    queryFn: ({ signal }) => getVehicleModels(year!, makeId!, signal),
    enabled: year !== null && makeId !== null,
  });
}

export function vehicleGenerationsQueryOptions(
  year: number | null,
  modelId: string | null,
) {
  return queryOptions({
    queryKey: queryKeys.vehicles.taxonomy.generations(year ?? 0, modelId ?? ""),
    queryFn: ({ signal }) => getVehicleGenerations(year!, modelId!, signal),
    enabled: year !== null && modelId !== null,
  });
}

export function engineTypesQueryOptions(generationId: string | null) {
  return queryOptions({
    queryKey: queryKeys.vehicles.taxonomy.engines(generationId ?? ""),
    queryFn: ({ signal }) => getEngineTypes(generationId!, signal),
    enabled: generationId !== null,
  });
}
