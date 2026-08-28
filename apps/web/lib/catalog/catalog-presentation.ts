import type { ProductVariantDetail } from "./catalog-types";

type ListingCondition = ProductVariantDetail["listings"][number]["condition"];

const CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "Новий",
  USED: "Вживаний",
  REMANUFACTURED: "Відновлений",
};

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function conditionLabel(condition: ListingCondition): string {
  return CONDITION_LABELS[condition];
}

export function formatMoney(amount: string, currency: string): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(Number(amount));
}
