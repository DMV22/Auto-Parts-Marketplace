"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, LinkIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  authErrorMessage,
  passwordSetupErrorMessage,
} from "@/lib/auth/auth-error";
import {
  createAccountPassword,
  linkGoogleAccount,
} from "@/lib/auth/auth-api";
import {
  createAccountPasswordSchema,
  type CreateAccountPasswordInput,
} from "@/lib/auth/auth-schemas";
import { queryKeys } from "@/lib/query/query-keys";
import {
  linkedAuthAccountsQueryOptions,
  sessionQueryOptions,
} from "@/lib/query/session-query";
import styles from "./account-security-page.module.css";

type AccountSecurityPageProps = {
  linkFailed?: boolean;
  linkSucceeded?: boolean;
};

export function AccountSecurityPage({
  linkFailed = false,
  linkSucceeded = false,
}: Readonly<AccountSecurityPageProps>) {
  const session = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const [passwordCreated, setPasswordCreated] = useState(false);
  const passwordForm = useForm<CreateAccountPasswordInput>({
    resolver: zodResolver(createAccountPasswordSchema),
    defaultValues: { confirmPassword: "", newPassword: "" },
  });
  const canManageAccounts = Boolean(session.data?.user.isActive);
  const accounts = useQuery(
    linkedAuthAccountsQueryOptions(canManageAccounts),
  );
  const linkGoogle = useMutation({
    mutationFn: linkGoogleAccount,
    onSuccess: async (authorizationUrl) => {
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.accounts,
      });
    },
  });
  const createPassword = useMutation({
    mutationFn: createAccountPassword,
    onSuccess: async () => {
      passwordForm.reset();
      setPasswordCreated(true);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.accounts,
      });
    },
  });
  const submitPassword = passwordForm.handleSubmit((input) => {
    setPasswordCreated(false);
    createPassword.mutate(input);
  });

  if (session.isPending) {
    return (
      <main id="main-content" className={styles.main}>
        <p role="status">Перевіряємо сесію…</p>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main id="main-content" className={styles.main}>
        <p role="alert">Не вдалося перевірити сесію. Оновіть сторінку.</p>
      </main>
    );
  }

  if (!session.data) {
    return (
      <main id="main-content" className={styles.main}>
        <section className={styles.panel} aria-labelledby="security-title">
          <h1 id="security-title">Безпека акаунта</h1>
          <p>Увійдіть, щоб керувати способами входу.</p>
          <Button render={<Link href="/sign-in?returnTo=%2Faccount%2Fsecurity" />}>
            Увійти
          </Button>
        </section>
      </main>
    );
  }

  if (!session.data.user.isActive) {
    return (
      <main id="main-content" className={styles.main}>
        <section className={styles.panel} aria-labelledby="security-title">
          <h1 id="security-title">Безпека акаунта</h1>
          <p className={styles.error} role="alert">
            Акаунт неактивний
          </p>
          <p>Керування способами входу недоступне.</p>
        </section>
      </main>
    );
  }

  const googleIsLinked = accounts.data?.some(
    (account) => account.providerId === "google",
  );
  const credentialIsLinked = accounts.data?.some(
    (account) => account.providerId === "credential",
  );

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Налаштування входу</p>
        <h1>Безпека акаунта</h1>
        <p>
          Керуйте способами входу для {session.data.user.email}. Прив’язування
          Google дозволене лише до акаунта з тим самим email.
        </p>
      </header>

      {linkSucceeded ? (
        <p className={styles.success} role="status">
          Google-акаунт успішно підключено.
        </p>
      ) : null}
      {linkFailed ? (
        <p className={styles.error} role="alert">
          Не вдалося підключити Google. Переконайтеся, що email збігається і
          цей Google-акаунт не використовується іншим користувачем.
        </p>
      ) : null}
      {passwordCreated ? (
        <p
          className={styles.success}
          role="status"
          aria-label="Пароль створено"
        >
          Пароль створено. Тепер ви можете входити через Google або email і
          пароль.
        </p>
      ) : null}

      <section className={styles.panel} aria-labelledby="methods-title">
        <div className={styles.panelHeading}>
          <ShieldCheckIcon aria-hidden="true" />
          <div>
            <h2 id="methods-title">Способи входу</h2>
            <p>Жодні токени або provider account IDs не показуються в UI.</p>
          </div>
        </div>

        {accounts.isPending ? (
          <p role="status">Завантажуємо способи входу…</p>
        ) : accounts.isError ? (
          <div className={styles.error} role="alert">
            <p>{authErrorMessage(accounts.error)}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void accounts.refetch()}
            >
              Спробувати ще раз
            </Button>
          </div>
        ) : (
          <ul className={styles.methods}>
            <li className={styles.credentialMethod}>
              <div>
                <strong>Email і пароль</strong>
                <span>
                  {credentialIsLinked
                    ? "Основний спосіб входу"
                    : "Не підключено"}
                </span>
              </div>
              {credentialIsLinked ? (
                <span className={styles.linked}>
                  <CheckCircle2Icon aria-hidden="true" /> Підключено
                </span>
              ) : (
                <form
                  className={styles.passwordForm}
                  onSubmit={submitPassword}
                  noValidate
                >
                  <div className={styles.passwordFormHeading}>
                    <h3>Створити пароль</h3>
                    <p>
                      Додайте пароль як другий спосіб входу. Поточна Google-сесія
                      підтверджує ваш акаунт.
                    </p>
                  </div>
                  <div className={styles.passwordFields}>
                    <Field
                      data-invalid={Boolean(
                        passwordForm.formState.errors.newPassword,
                      )}
                    >
                      <FieldLabel htmlFor="account-new-password">
                        Новий пароль
                      </FieldLabel>
                      <Input
                        id="account-new-password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(
                          passwordForm.formState.errors.newPassword,
                        )}
                        aria-describedby={
                          passwordForm.formState.errors.newPassword
                            ? "account-new-password-error"
                            : "account-password-requirements"
                        }
                        {...passwordForm.register("newPassword")}
                      />
                      <FieldError
                        id="account-new-password-error"
                        errors={[
                          passwordForm.formState.errors.newPassword,
                        ]}
                      />
                    </Field>
                    <Field
                      data-invalid={Boolean(
                        passwordForm.formState.errors.confirmPassword,
                      )}
                    >
                      <FieldLabel htmlFor="account-confirm-password">
                        Підтвердьте пароль
                      </FieldLabel>
                      <Input
                        id="account-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(
                          passwordForm.formState.errors.confirmPassword,
                        )}
                        aria-describedby={
                          passwordForm.formState.errors.confirmPassword
                            ? "account-confirm-password-error"
                            : undefined
                        }
                        {...passwordForm.register("confirmPassword")}
                      />
                      <FieldError
                        id="account-confirm-password-error"
                        errors={[
                          passwordForm.formState.errors.confirmPassword,
                        ]}
                      />
                    </Field>
                  </div>
                  <div className={styles.passwordActions}>
                    <p id="account-password-requirements">
                      Від 8 до 128 символів.
                    </p>
                    <Button
                      type="submit"
                      disabled={createPassword.isPending}
                    >
                      {createPassword.isPending
                        ? "Створюємо пароль…"
                        : "Створити пароль"}
                    </Button>
                  </div>
                  {createPassword.isError ? (
                    <p className={styles.error} role="alert">
                      {passwordSetupErrorMessage(createPassword.error)}
                    </p>
                  ) : null}
                </form>
              )}
            </li>
            <li>
              <div>
                <strong>Google</strong>
                <span>
                  {googleIsLinked
                    ? "Google підключено"
                    : "Google не підключено"}
                </span>
              </div>
              {googleIsLinked ? (
                <span className={styles.linked}>
                  <CheckCircle2Icon aria-hidden="true" /> Підключено
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={linkGoogle.isPending}
                  onClick={() => linkGoogle.mutate()}
                >
                  <LinkIcon aria-hidden="true" />
                  {linkGoogle.isPending
                    ? "Переходимо до Google…"
                    : "Підключити Google"}
                </Button>
              )}
            </li>
          </ul>
        )}

        {linkGoogle.isError ? (
          <p className={styles.error} role="alert">
            {authErrorMessage(linkGoogle.error)}
          </p>
        ) : null}
      </section>
    </main>
  );
}
