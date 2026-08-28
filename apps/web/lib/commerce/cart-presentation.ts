import { AppError } from "@/lib/api/app-error";
import type { CartAvailabilityIssue } from "./cart-types";

type CartMessage = {
  title: string;
  message: string;
};

export type CartErrorPresentation = CartMessage & {
  retryable: boolean;
};

const issueMessages: Record<CartAvailabilityIssue, CartMessage> = {
  LISTING_UNAVAILABLE: {
    title: "Пропозиція більше недоступна",
    message: "Видаліть її з кошика та оберіть іншу активну пропозицію.",
  },
  INSUFFICIENT_STOCK: {
    title: "Недостатньо товару в наявності",
    message: "Зменште кількість або оновіть кошик, щоб побачити актуальний залишок.",
  },
  CURRENCY_MISMATCH: {
    title: "Валюта пропозиції змінилася",
    message: "Видаліть цю позицію та додайте актуальну пропозицію повторно.",
  },
};

export function presentCartIssue(issue: CartAvailabilityIssue): CartMessage {
  return issueMessages[issue];
}

export function presentCartError(error: unknown): CartErrorPresentation {
  if (error instanceof AppError) {
    if (error.kind === "conflict") {
      return {
        title: "Кошик змінився",
        message: "Оновіть дані кошика та повторіть дію з актуальними ціною і залишком.",
        retryable: true,
      };
    }
    if (error.kind === "not_found") {
      return {
        title: "Позицію не знайдено",
        message: "Вона могла бути видалена або більше не належить цьому кошику.",
        retryable: true,
      };
    }
    if (error.kind === "forbidden") {
      return {
        title: "Кошик недоступний для цієї ролі",
        message: "Для покупок використайте Customer-акаунт або гостьовий режим.",
        retryable: false,
      };
    }
    if (error.kind === "unavailable" || error.kind === "network") {
      return {
        title: "Кошик тимчасово недоступний",
        message: "Перевірте з’єднання та спробуйте ще раз.",
        retryable: true,
      };
    }
  }

  return {
    title: "Не вдалося оновити кошик",
    message: "Спробуйте ще раз. Якщо проблема повториться, оновіть сторінку.",
    retryable: true,
  };
}
