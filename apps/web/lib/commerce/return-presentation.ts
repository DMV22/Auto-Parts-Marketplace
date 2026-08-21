import { AppError } from "@/lib/api/app-error";
import type { OrderStatus } from "./checkout-types";
import type { ReturnRequestStatus } from "./return-types";

type ReturnStatusPresentation = {
  label: string;
  terminal: boolean;
};

const returnStatuses: Record<ReturnRequestStatus, ReturnStatusPresentation> = {
  REQUESTED: { label: "Запит створено", terminal: false },
  UNDER_REVIEW: { label: "На розгляді", terminal: false },
  APPROVED: { label: "Погоджено", terminal: false },
  REJECTED: { label: "Відхилено", terminal: true },
  RECEIVED: { label: "Товар отримано", terminal: false },
  COMPLETED: { label: "Завершено", terminal: true },
  CANCELLED: { label: "Скасовано", terminal: true },
};

const cancellableStatuses = new Set<ReturnRequestStatus>([
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
]);

export function presentReturnStatus(
  status: ReturnRequestStatus,
): ReturnStatusPresentation {
  return returnStatuses[status];
}

export function canCancelReturn(status: ReturnRequestStatus): boolean {
  return cancellableStatuses.has(status);
}

export function canCreateReturn(
  orderStatus: OrderStatus,
  statuses: readonly ReturnRequestStatus[],
): boolean {
  return (
    orderStatus === "DELIVERED" &&
    statuses.every((status) => presentReturnStatus(status).terminal)
  );
}

export function presentReturnError(
  error: unknown,
  operation: "load" | "create" | "cancel" = "load",
): string {
  if (error instanceof AppError) {
    if (error.kind === "conflict") {
      return operation === "create"
        ? "Для цієї позиції вже існує незавершений запит. Оновлюємо його статус."
        : "Статус повернення вже змінився. Оновлюємо актуальні дані.";
    }
    if (error.kind === "not_found") {
      return "Позиція недоступна або більше не відповідає умовам повернення.";
    }
    if (error.kind === "validation") {
      return "Перевірте причину повернення та повторіть спробу.";
    }
    if (error.kind === "forbidden" || error.kind === "unauthenticated") {
      return "Ця дія доступна лише активному Customer-власнику замовлення.";
    }
  }
  return "Не вдалося оновити повернення. Спробуйте ще раз.";
}
