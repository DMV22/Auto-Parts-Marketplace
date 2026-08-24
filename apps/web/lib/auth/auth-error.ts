import { AppError } from "@/lib/api/app-error";

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof AppError)) {
    return "Сталася неочікувана помилка. Спробуйте ще раз.";
  }

  switch (error.kind) {
    case "unauthenticated":
      return "Перевірте email і пароль та повторіть спробу.";
    case "forbidden":
      return "Обліковий запис неактивний або не має доступу.";
    case "conflict":
      return "Акаунт із такою email-адресою вже існує.";
    case "network":
    case "unavailable":
      return "Сервіс автентифікації тимчасово недоступний.";
    default:
      return "Не вдалося виконати операцію. Спробуйте ще раз.";
  }
}
