"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { signInWithEmail } from "@/lib/auth/auth-api";
import {
  signInSchema,
  type SignInInput,
} from "@/lib/auth/auth-schemas";
import styles from "./auth-form.module.css";
import { GoogleAuthButton } from "./google-auth-button";
import { useAuthCompletion } from "./use-auth-completion";

export function SignInForm({ returnTo }: { returnTo: string }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const completeAuthentication = useAuthCompletion(returnTo);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await signInWithEmail(values);
      await completeAuthentication();
    } catch (error) {
      setSubmitError(authErrorMessage(error));
    }
  });

  return (
    <FieldGroup>
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            aria-invalid={Boolean(form.formState.errors.email)}
            aria-describedby={
              form.formState.errors.email ? "sign-in-email-error" : undefined
            }
            {...form.register("email")}
          />
          <FieldError
            id="sign-in-email-error"
            errors={[form.formState.errors.email]}
          />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="sign-in-password">Пароль</FieldLabel>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            aria-describedby={
              form.formState.errors.password
                ? "sign-in-password-error"
                : undefined
            }
            {...form.register("password")}
          />
          <FieldError
            id="sign-in-password-error"
            errors={[form.formState.errors.password]}
          />
        </Field>
        {submitError ? (
          <p
            className={styles.globalError}
            role="alert"
            aria-label="Не вдалося виконати вхід"
          >
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
                aria-label="Виконується вхід"
                className="motion-reduce:animate-none"
              />
              Входимо…
            </>
          ) : (
            "Увійти"
          )}
        </Button>
      </form>
      <FieldSeparator>або</FieldSeparator>
      <GoogleAuthButton returnTo={returnTo} />
      <p className={styles.switchText}>
        Ще немає акаунта?{" "}
        <Link className={styles.switchLink} href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`}>
          Зареєструватися
        </Link>
      </p>
    </FieldGroup>
  );
}
