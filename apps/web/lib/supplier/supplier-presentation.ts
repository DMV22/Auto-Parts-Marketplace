import { AppError } from "@/lib/api/app-error";
import type {
  ListingStatus,
  SupplierListing,
  SupplierListingAction,
} from "./supplier-types";

const statusLabels: Record<ListingStatus, string> = {
  DRAFT: "Чернетка",
  PENDING_APPROVAL: "Очікує перевірки",
  ACTIVE: "Опубліковано",
  PAUSED: "Призупинено",
  REJECTED: "Відхилено",
  ARCHIVED: "Архів",
};

const actionLabels: Record<SupplierListingAction, string> = {
  submit: "Надіслати на перевірку",
  pause: "Призупинити",
  resume: "Відновити",
  archive: "Архівувати",
};

export function presentListingStatus(status: ListingStatus): string {
  return statusLabels[status];
}

export function presentListingAction(action: SupplierListingAction): string {
  return actionLabels[action];
}

export function availableListingActions(
  listing: Pick<SupplierListing, "status" | "moderationReason">,
): SupplierListingAction[] {
  if (listing.status === "ARCHIVED") return [];
  const actions: SupplierListingAction[] = [];
  if (listing.status === "DRAFT" || listing.status === "REJECTED") {
    actions.push("submit");
  }
  if (listing.status === "ACTIVE") actions.push("pause");
  if (listing.status === "PAUSED" && !listing.moderationReason) {
    actions.push("resume");
  }
  actions.push("archive");
  return actions;
}

export function listingFormError(error: unknown): string {
  if (error instanceof AppError) {
    if (error.kind === "validation") {
      return "Перевірте варіант товару, стан, ціну та валюту.";
    }
    if (error.kind === "not_found") {
      return "Варіант товару або оголошення більше недоступні.";
    }
    if (error.kind === "conflict") {
      return "Оголошення змінилося. Оновіть дані перед повторною дією.";
    }
    if (error.kind === "unauthenticated") {
      return "Сесія завершилася. Увійдіть повторно.";
    }
    if (error.kind === "forbidden") {
      return "Немає доступу до цього постачальника.";
    }
  }
  return "Не вдалося зберегти оголошення. Спробуйте ще раз.";
}

export function inventoryError(error: unknown): {
  message: string;
  conflict: boolean;
} {
  if (error instanceof AppError && error.kind === "conflict") {
    return {
      message:
        "Залишок уже змінився в іншій операції. Перечитайте актуальні дані та повторіть.",
      conflict: true,
    };
  }
  return {
    message: "Не вдалося оновити залишок. Спробуйте ще раз.",
    conflict: false,
  };
}
