import { AppError } from "@/lib/api/app-error";
import type {
  InternalOrderStatus,
  ReturnRequestStatus,
} from "./internal-ops-types";

const orderLabels: Record<InternalOrderStatus, string> = {
  PENDING_PAYMENT: "Очікує оплати",
  PAID: "Оплачено",
  PROCESSING: "Опрацьовується",
  SHIPPED: "Відправлено",
  DELIVERED: "Доставлено",
  CANCELLED: "Скасовано",
};
const returnLabels: Record<ReturnRequestStatus, string> = {
  REQUESTED: "Запит створено",
  UNDER_REVIEW: "На розгляді",
  APPROVED: "Схвалено",
  REJECTED: "Відхилено",
  RECEIVED: "Отримано",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

export function presentOrderStatus(status: InternalOrderStatus): string {
  return orderLabels[status];
}

export function presentReturnStatus(status: ReturnRequestStatus): string {
  return returnLabels[status];
}

export function nextOrderStatus(
  status: InternalOrderStatus,
): InternalOrderStatus | null {
  if (status === "PAID") return "PROCESSING";
  if (status === "PROCESSING") return "SHIPPED";
  if (status === "SHIPPED") return "DELIVERED";
  return null;
}

export function nextReturnStatuses(
  status: ReturnRequestStatus,
): ReturnRequestStatus[] {
  if (status === "REQUESTED") return ["UNDER_REVIEW"];
  if (status === "UNDER_REVIEW") return ["APPROVED", "REJECTED"];
  if (status === "APPROVED") return ["RECEIVED"];
  if (status === "RECEIVED") return ["COMPLETED"];
  return [];
}

export function canSubmitReturnTransition(
  targetStatus: ReturnRequestStatus | "",
  reason: string,
): boolean {
  return Boolean(
    targetStatus && (targetStatus !== "REJECTED" || reason.trim()),
  );
}

export function internalMutationError(error: unknown): string {
  if (!(error instanceof AppError)) {
    return "Не вдалося виконати дію. Спробуйте ще раз.";
  }
  if (error.kind === "conflict") {
    return "Стан уже змінився. Оновіть дані та повторіть дію, якщо вона ще доступна.";
  }
  if (error.kind === "forbidden" || error.kind === "unauthenticated") {
    return "Поточна роль або сесія не дозволяє виконати цю дію.";
  }
  if (error.kind === "not_found") {
    return "Ресурс не знайдено або він недоступний для поточної ролі.";
  }
  if (error.kind === "validation") {
    return "Перевірте введені дані та спробуйте ще раз.";
  }
  return "Internal API тимчасово недоступний. Спробуйте ще раз.";
}

export function formatInternalDate(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
