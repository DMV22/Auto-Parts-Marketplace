"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { getActiveSavedVehicleId } from "@/lib/garage/active-vehicle";
import type { GarageVehicle } from "@/lib/garage/garage-types";
import { garageVehiclesQueryOptions } from "@/lib/query/garage-queries";
import { sessionQueryOptions } from "@/lib/query/session-query";

export type CatalogVehicleContextModel =
  | { kind: "error" }
  | { kind: "empty" }
  | {
      kind: "active";
      vehicle: GarageVehicle;
      filtering: boolean;
      onToggle: () => void;
    };

export function useCatalogVehicleContext() {
  const [useActiveVehicle, setUseActiveVehicle] = useState(true);
  const session = useQuery(sessionQueryOptions());
  const isCustomer =
    session.data?.user.role === "CUSTOMER" && session.data.user.isActive;
  const garage = useQuery({
    ...garageVehiclesQueryOptions(),
    enabled: isCustomer,
  });
  const activeVehicle = garage.data?.find((vehicle) => vehicle.isActive) ?? null;
  const filtering = useActiveVehicle && Boolean(activeVehicle);
  const toggle = useCallback(
    () => setUseActiveVehicle((current) => !current),
    [],
  );

  let model: CatalogVehicleContextModel;
  if (garage.isError) {
    model = { kind: "error" };
  } else if (activeVehicle) {
    model = {
      kind: "active",
      vehicle: activeVehicle,
      filtering,
      onToggle: toggle,
    };
  } else {
    model = { kind: "empty" };
  }

  return {
    model,
    savedVehicleId: filtering ? getActiveSavedVehicleId(garage.data) : null,
    ready: !session.isPending && (!isCustomer || !garage.isPending),
  };
}
