"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, LinkIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { linkGoogleAccount } from "@/lib/auth/auth-api";
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
            <li>
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
              ) : null}
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
