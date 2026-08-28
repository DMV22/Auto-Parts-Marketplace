import {
  BadgeCheckIcon,
  CircleHelpIcon,
  ShieldXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { FitmentStatus } from "@/lib/catalog/catalog-types";
import styles from "./FitmentBadge.module.css";

const ICONS = {
  compatible: BadgeCheckIcon,
  incompatible: ShieldXIcon,
  unknown: CircleHelpIcon,
  caution: TriangleAlertIcon,
} satisfies Record<FitmentStatus, typeof BadgeCheckIcon>;

export function FitmentBadge({
  status,
  label,
}: Readonly<{ status: FitmentStatus; label: string }>) {
  const Icon = ICONS[status];
  return (
    <span className={styles.badge} data-status={status}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
