import type { ZodType } from "zod";
import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  engineTypesResponseSchema,
  type EngineType,
  type VehicleGeneration,
  vehicleGenerationsResponseSchema,
  type VehicleMake,
  vehicleMakesResponseSchema,
  type VehicleModel,
  vehicleModelsResponseSchema,
  vehicleYearsResponseSchema,
} from "./vehicle-types";

type CollectionResponse<T> = { data: T[] };

function taxonomyPath(
  resource: "makes" | "models" | "generations" | "engines",
  query: Record<string, number | string>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    search.set(key, String(value));
  }

  return `/api/v1/vehicles/${resource}?${search.toString()}`;
}

async function validatedCollection<T>(
  path: string,
  schema: ZodType<CollectionResponse<T>>,
  signal?: AbortSignal,
): Promise<T[]> {
  const payload = await apiRequest<unknown>(path, { signal });
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new AppError("Vehicle taxonomy response does not match its contract", {
      kind: "invalid_response",
      details: result.error.flatten(),
    });
  }

  return result.data.data;
}

export function getVehicleYears(signal?: AbortSignal): Promise<number[]> {
  return validatedCollection(
    "/api/v1/vehicles/years",
    vehicleYearsResponseSchema,
    signal,
  );
}

export function getVehicleMakes(
  year: number,
  signal?: AbortSignal,
): Promise<VehicleMake[]> {
  return validatedCollection(
    taxonomyPath("makes", { year }),
    vehicleMakesResponseSchema,
    signal,
  );
}

export function getVehicleModels(
  year: number,
  makeId: string,
  signal?: AbortSignal,
): Promise<VehicleModel[]> {
  return validatedCollection(
    taxonomyPath("models", { year, makeId }),
    vehicleModelsResponseSchema,
    signal,
  );
}

export function getVehicleGenerations(
  year: number,
  modelId: string,
  signal?: AbortSignal,
): Promise<VehicleGeneration[]> {
  return validatedCollection(
    taxonomyPath("generations", { year, modelId }),
    vehicleGenerationsResponseSchema,
    signal,
  );
}

export function getEngineTypes(
  generationId: string,
  signal?: AbortSignal,
): Promise<EngineType[]> {
  return validatedCollection(
    taxonomyPath("engines", { generationId }),
    engineTypesResponseSchema,
    signal,
  );
}
