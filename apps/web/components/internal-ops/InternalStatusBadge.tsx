import type { InternalOrderStatus, ReturnRequestStatus } from "@/lib/internal-ops/internal-ops-types";
import {
  presentOrderStatus,
  presentReturnStatus,
} from "@/lib/internal-ops/internal-ops-presentation";
import styles from "./internal-ops.module.css";

export function OrderStatusBadge({ status }: { status: InternalOrderStatus }) {
  return (
    <span className={styles.badge} data-tone={orderTone(status)}>
      {presentOrderStatus(status)}
    </span>
  );
}

export function ReturnStatusBadge({ status }: { status: ReturnRequestStatus }) {
  return (
    <span className={styles.badge} data-tone={returnTone(status)}>
      {presentReturnStatus(status)}
    </span>
  );
}

function orderTone(status: InternalOrderStatus) {
  if (status === "DELIVERED" || status === "PAID") return "positive";
  if (status === "PENDING_PAYMENT" || status === "PROCESSING") return "warning";
  if (status === "CANCELLED") return "negative";
  return "neutral";
}

function returnTone(status: ReturnRequestStatus) {
  if (status === "COMPLETED" || status === "APPROVED") return "positive";
  if (status === "REQUESTED" || status === "UNDER_REVIEW") return "warning";
  if (status === "REJECTED" || status === "CANCELLED") return "negative";
  return "neutral";
}
