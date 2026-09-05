import { AppError } from "@/lib/api/app-error";
import type { OrderStatus } from "./checkout-types";
import type {
  OrderItemSnapshot,
  OrderTimelineReasonCode,
} from "./order-types";

export type OrderStatusPresentation = {
  label: string;
  tone: "pending" | "info" | "success" | "cancelled";
};

const orderStatuses: Record<OrderStatus, OrderStatusPresentation> = {
  PENDING_PAYMENT: { label: "Очікує оплати", tone: "pending" },
  PAID: { label: "Оплачено", tone: "success" },
  PROCESSING: { label: "Опрацьовується", tone: "info" },
  SHIPPED: { label: "Відправлено", tone: "info" },
  DELIVERED: { label: "Доставлено", tone: "success" },
  CANCELLED: { label: "Скасовано", tone: "cancelled" },
};

const timelineReasons: Record<OrderTimelineReasonCode, string> = {
  ORDER_CREATED: "Замовлення створено",
  PAYMENT_CONFIRMED: "Оплату підтверджено",
  PAYMENT_FAILED: "Оплату не підтверджено",
  CHECKOUT_EXPIRED: "Checkout-сесію завершено",
  CHECKOUT_FAILED: "Не вдалося створити checkout",
  STATUS_UPDATED: "Статус замовлення оновлено",
};

const orderDateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatOrderDate(value: string): string {
  return orderDateFormatter.format(new Date(value));
}

export function presentOrderStatus(
  status: OrderStatus,
): OrderStatusPresentation {
  return orderStatuses[status];
}

export function presentTimelineReason(
  reason: OrderTimelineReasonCode,
): string {
  return timelineReasons[reason];
}

export type OrderItemSnapshotPresentation = {
  name: string;
  sku: string | null;
  manufacturerPartNumber: string | null;
  supplierName: string | null;
  condition: string | null;
};

export function presentOrderItemSnapshot(
  item: OrderItemSnapshot,
): OrderItemSnapshotPresentation {
  return {
    name: item.productName ?? "Товар із замовлення",
    sku: item.sku,
    manufacturerPartNumber: item.manufacturerPartNumber,
    supplierName: item.supplierName,
    condition:
      item.condition === "NEW"
        ? "Новий"
        : item.condition === "USED"
          ? "Вживаний"
          : item.condition === "REMANUFACTURED"
            ? "Відновлений"
            : null,
  };
}

export type OrderErrorPresentation = {
  title: string;
  message: string;
  retryable: boolean;
};

export function presentOrderError(error: unknown): OrderErrorPresentation {
  if (error instanceof AppError && error.kind === "not_found") {
    return {
      title: "Замовлення недоступне",
      message: "Замовлення не знайдено або воно недоступне в цьому контексті.",
      retryable: false,
    };
  }

  if (
    error instanceof AppError &&
    (error.kind === "network" || error.kind === "unavailable")
  ) {
    return {
      title: "Історія замовлень тимчасово недоступна",
      message: "Перевірте з’єднання та повторіть запит.",
      retryable: true,
    };
  }

  return {
    title: "Не вдалося завантажити замовлення",
    message: "Спробуйте оновити дані трохи пізніше.",
    retryable: true,
  };
}
