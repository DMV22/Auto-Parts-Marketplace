import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Введіть коректну email-адресу"));

const passwordSchema = z
  .string()
  .min(8, "Пароль має містити щонайменше 8 символів")
  .max(128, "Пароль не може перевищувати 128 символів");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = signInSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Ім’я має містити щонайменше 2 символи")
    .max(100, "Ім’я не може перевищувати 100 символів"),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
