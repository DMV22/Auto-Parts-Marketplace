import { AppError } from "@/lib/api/app-error";
import type { OrderStatus } from "./checkout-types";

export type CheckoutReturnMode = "success" | "cancel";

type CheckoutStatusPresentation = {
  tone: "pending" | "success" | "warning" | "cancelled";
  title: string;
  message: string;
  polling: boolean;
};

const confirmedStatuses: readonly OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export function presentCheckoutStatus(
  status: OrderStatus,
  timedOut: boolean,
  mode: CheckoutReturnMode,
): CheckoutStatusPresentation {
  if (confirmedStatuses.includes(status)) {
    return {
      tone: "success",
      title: "Оплату підтверджено",
      message: "Замовлення підтверджене сервером після обробки Stripe webhook.",
      polling: false,
    };
  }

  if (status === "CANCELLED") {
    return {
      tone: "cancelled",
      title: "Замовлення скасовано",
      message: "Оплату не підтверджено. Ви можете повернутися до кошика.",
      polling: false,
    };
  }

  if (timedOut) {
    return {
      tone: "warning",
      title: "Підтвердження займає більше часу",
      message: "Статус залишається pending. Оновіть його вручну трохи пізніше.",
      polling: false,
    };
  }

  return {
    tone: "pending",
    title:
      mode === "cancel"
        ? "Перевіряємо стан замовлення"
        : "Очікуємо підтвердження оплати",
    message:
      mode === "cancel"
        ? "Повернення зі Stripe не змінює статус. Чекаємо авторитетну відповідь API."
        : "Не закривайте сторінку: статус оновиться після валідного Stripe webhook.",
    polling: true,
  };
}

export function presentCheckoutError(error: unknown): string {
  if (error instanceof AppError) {
    if (error.kind === "not_found") {
      return "Замовлення не знайдено або воно належить іншому owner context.";
    }
    if (error.kind === "network" || error.kind === "unavailable") {
      return "Сервіс тимчасово недоступний. Повторіть перевірку статусу.";
    }
  }

  return "Не вдалося отримати актуальний статус замовлення.";
}
