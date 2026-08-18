import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  type CreateGarageVehicleInput,
  garageCollectionResponseSchema,
  garageItemResponseSchema,
  type GarageVehicle,
} from "./garage-types";

function invalidResponse(details: unknown): AppError {
  return new AppError("Garage response does not match its contract", {
    kind: "invalid_response",
    details,
  });
}

export async function getGarageVehicles(
  signal?: AbortSignal,
): Promise<GarageVehicle[]> {
  const payload = await apiRequest<unknown>("/api/v1/garage/vehicles", {
    signal,
  });
  const result = garageCollectionResponseSchema.safeParse(payload);

  if (!result.success) {
    throw invalidResponse(result.error.flatten());
  }

  return result.data.data;
}

export async function createGarageVehicle(
  input: CreateGarageVehicleInput,
): Promise<GarageVehicle> {
  const payload = await apiRequest<unknown>("/api/v1/garage/vehicles", {
    method: "POST",
    body: input,
  });
  const result = garageItemResponseSchema.safeParse(payload);

  if (!result.success) {
    throw invalidResponse(result.error.flatten());
  }

  return result.data.data;
}

export async function activateGarageVehicle(
  savedVehicleId: string,
): Promise<GarageVehicle> {
  const payload = await apiRequest<unknown>(
    `/api/v1/garage/vehicles/${savedVehicleId}/active`,
    { method: "PUT" },
  );
  const result = garageItemResponseSchema.safeParse(payload);

  if (!result.success) {
    throw invalidResponse(result.error.flatten());
  }

  return result.data.data;
}

export function deleteGarageVehicle(savedVehicleId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/garage/vehicles/${savedVehicleId}`, {
    method: "DELETE",
  });
}
