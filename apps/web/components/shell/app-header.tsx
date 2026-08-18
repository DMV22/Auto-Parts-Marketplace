"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/auth-api";
import type { UserRole } from "@/lib/auth/session";
import { queryKeys } from "@/lib/query/query-keys";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./app-header.module.css";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Адміністратор",
  CUSTOMER: "Клієнт",
  SUPPORT_MANAGER: "Підтримка",
  SUPPLIER_USER: "Постачальник",
};

export function AppHeader() {
  const session = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setSignOutError(false);
    setIsSigningOut(true);

    try {
      await signOut();
      queryClient.removeQueries();
      queryClient.setQueryData(queryKeys.auth.session, null);
      router.refresh();
    } catch {
      setSignOutError(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <nav className={styles.navigation} aria-label="Основна навігація">
        <Link className={styles.brand} href="/">
          Auto Parts Marketplace
        </Link>
        <div className={styles.sessionArea}>
          {session.isPending ? (
            <span role="status" className={styles.status}>
              Перевіряємо сесію…
            </span>
          ) : session.isError ? (
            <span role="status" className={styles.status}>
              Сесія тимчасово недоступна
            </span>
          ) : session.data ? (
            <div className={styles.account}>
              <span className={styles.identity}>
                <strong>{session.data.user.name}</strong>
                <span>{roleLabels[session.data.user.role]}</span>
                {!session.data.user.isActive ? (
                  <span className={styles.inactive}>Акаунт неактивний</span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                {isSigningOut ? "Виходимо…" : "Вийти"}
              </Button>
            </div>
          ) : (
            <div className={styles.actions}>
              <Link href="/sign-in">Увійти</Link>
              <Link className={styles.primaryLink} href="/sign-up">
                Реєстрація
              </Link>
            </div>
          )}
        </div>
      </nav>
      {signOutError ? (
        <p className={styles.error} role="alert">
          Не вдалося завершити сесію. Спробуйте ще раз.
        </p>
      ) : null}
    </header>
  );
}
