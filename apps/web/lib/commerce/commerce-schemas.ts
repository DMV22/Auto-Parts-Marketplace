import { z } from "zod";

export const commerceMoneySchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)\.\d{2}$/);

export const commerceCurrencySchema = z.string().regex(/^[A-Z]{3}$/);
