import { CarFrontIcon, CircleAlertIcon, CircleCheckIcon, LoaderCircleIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { GarageVehicle } from "@/lib/garage/garage-types";
import styles from "./VehicleContextRail.module.css";

type VehicleContextRailProps = {
  vehicle?: GarageVehicle;
  label: string;
  status: {
    tone: "neutral" | "info" | "success" | "warning";
    title: string;
    description: string;
  };
  action?: ReactNode;
  live?: boolean;
};

const statusIcons = {
  neutral: CarFrontIcon,
  info: LoaderCircleIcon,
  success: CircleCheckIcon,
  warning: CircleAlertIcon,
} as const;

function vehicleTitle(vehicle: GarageVehicle): string {
  return `${vehicle.year} ${vehicle.generation.model.make.name} ${vehicle.generation.model.name}`;
}

function vehicleDetails(vehicle: GarageVehicle): string {
  const generation = vehicle.generation.name ?? vehicle.generation.code;
  const engine = vehicle.engine?.name ?? "двигун не вказано";
  return `${generation} · ${engine}`;
}

export function VehicleContextRail({
  vehicle,
  label,
  status,
  action,
  live = false,
}: Readonly<VehicleContextRailProps>) {
  const StatusIcon = statusIcons[status.tone];

  return (
    <section
      className={styles.rail}
      data-tone={status.tone}
      aria-label="Контекст автомобіля"
    >
      <div className={styles.vehicle}>
        <CarFrontIcon aria-hidden="true" />
        <div>
          <span>{label}</span>
          <strong>{vehicle ? vehicleTitle(vehicle) : "Автомобіль не вибрано"}</strong>
          {vehicle ? <small>{vehicleDetails(vehicle)}</small> : null}
        </div>
      </div>

      <div className={styles.status} aria-live={live ? "polite" : undefined}>
        <StatusIcon aria-hidden="true" />
        <div>
          <strong>{status.title}</strong>
          <span>{status.description}</span>
        </div>
      </div>

      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
