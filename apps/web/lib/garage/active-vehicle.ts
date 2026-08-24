import type { GarageVehicle } from "./garage-types";

export function getActiveSavedVehicleId(
  vehicles: readonly GarageVehicle[] | undefined,
): string | null {
  return vehicles?.find((vehicle) => vehicle.isActive)?.id ?? null;
}
