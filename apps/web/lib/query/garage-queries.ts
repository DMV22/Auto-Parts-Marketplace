import { queryOptions } from "@tanstack/react-query";
import { getGarageVehicles } from "@/lib/garage/garage-api";
import { queryKeys } from "./query-keys";

export function garageVehiclesQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.garage.vehicles,
    queryFn: ({ signal }) => getGarageVehicles(signal),
  });
}
