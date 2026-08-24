"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { signUpWithEmail } from "@/lib/auth/auth-api";
import {
  signUpSchema,
  type SignUpInput,
} from "@/lib/auth/auth-schemas";
import styles from "./auth-form.module.css";
import { GoogleAuthButton } from "./google-auth-button";
import { useAuthCompletion } from "./use-auth-completion";

export function SignUpForm({ returnTo }: { returnTo: string }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const completeAuthentication = useAuthCompletion(returnTo);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", name: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await signUpWithEmail(values);
      await completeAuthentication();
    } catch (error) {
      setSubmitError(authErrorMessage(error));
    }
  });

  return (
    <FieldGroup>
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="sign-up-name">Ім’я</FieldLabel>
          <Input
            id="sign-up-name"
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.name)}
            aria-describedby={
              form.formState.errors.name ? "sign-up-name-error" : undefined
            }
            {...form.register("name")}
          />
          <FieldError
            id="sign-up-name-error"
            errors={[form.formState.errors.name]}
          />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            aria-invalid={Boolean(form.formState.errors.email)}
            aria-describedby={
              form.formState.errors.email ? "sign-up-email-error" : undefined
            }
            {...form.register("email")}
          />
          <FieldError
            id="sign-up-email-error"
            errors={[form.formState.errors.email]}
          />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="sign-up-password">Пароль</FieldLabel>
          <Input
            id="sign-up-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            aria-describedby={
              form.formState.errors.password
                ? "sign-up-password-description sign-up-password-error"
                : "sign-up-password-description"
            }
            {...form.register("password")}
          />
          <FieldDescription id="sign-up-password-description">
            Щонайменше 8 символів.
          </FieldDescription>
          <FieldError
            id="sign-up-password-error"
            errors={[form.formState.errors.password]}
          />
        </Field>
        {submitError ? (
          <p className={styles.globalError} role="alert">
            {submitError}
          </p>
        ) : null}
        <Button
          className={styles.submit}
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Spinner
                data-icon="inline-start"
                aria-label="Створюється акаунт"
                className="motion-reduce:animate-none"
              />
              Створюємо…
            </>
          ) : (
            "Створити акаунт"
          )}
        </Button>
      </form>
      <FieldSeparator>або</FieldSeparator>
      <GoogleAuthButton returnTo={returnTo} />
      <p className={styles.switchText}>
        Уже маєте акаунт?{" "}
        <Link className={styles.switchLink} href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>
          Увійти
        </Link>
      </p>
    </FieldGroup>
  );
}
