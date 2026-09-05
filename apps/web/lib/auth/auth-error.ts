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

export function passwordSetupErrorMessage(error: unknown): string {
  if (!(error instanceof AppError)) {
    return "Не вдалося створити пароль. Спробуйте ще раз.";
  }

  switch (error.kind) {
    case "unauthenticated":
      return "Для безпеки вийдіть і повторно увійдіть через Google, а потім спробуйте ще раз.";
    case "conflict":
      return "Пароль уже створено. Оновіть сторінку.";
    case "network":
    case "unavailable":
      return "Сервіс автентифікації тимчасово недоступний.";
    default:
      return "Не вдалося створити пароль. Перевірте вимоги та спробуйте ще раз.";
  }
}
