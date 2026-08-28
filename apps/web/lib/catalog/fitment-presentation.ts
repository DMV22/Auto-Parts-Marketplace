import type {
  FitmentAnswer,
  FitmentReasonCode,
  FitmentStatus,
} from "./catalog-types";

export type FitmentPresentation = {
  status: FitmentStatus;
  label: string;
  explanation: string;
};

const STATUS_LABELS: Record<FitmentStatus, string> = {
  compatible: "Сумісна",
  incompatible: "Не сумісна",
  unknown: "Сумісність не підтверджена",
  caution: "Потрібне уточнення",
};

const REASON_EXPLANATIONS: Record<FitmentReasonCode, string> = {
  VEHICLE_NOT_SELECTED:
    "Оберіть автомобіль, щоб перевірити сумісність цієї модифікації.",
  EXACT_ENGINE_MATCH:
    "Є правило сумісності саме для вибраного двигуна.",
  EXACT_ENGINE_EXCLUSION:
    "Є правило виключення саме для вибраного двигуна.",
  GENERATION_MATCH:
    "Є правило сумісності для вибраного покоління автомобіля.",
  GENERATION_EXCLUSION:
    "Є правило виключення для вибраного покоління автомобіля.",
  ENGINE_REQUIRED:
    "Для точної перевірки потрібно вказати двигун автомобіля.",
  NO_FITMENT_DATA:
    "Для цієї модифікації немає достатніх даних про сумісність.",
};

export function presentFitment(answer: FitmentAnswer): FitmentPresentation {
  return {
    status: answer.status,
    label: STATUS_LABELS[answer.status],
    explanation: REASON_EXPLANATIONS[answer.reasonCode],
  };
}
