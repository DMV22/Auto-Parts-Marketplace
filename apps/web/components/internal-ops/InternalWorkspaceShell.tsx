"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/auth/session";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./internal-ops.module.css";

export function InternalWorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <InternalAccessBoundary allowedRoles={["SUPPORT_MANAGER", "ADMIN"]}>
      <div className={styles.shell}>
        <header className={styles.heading}>
          <p>Internal CRM / OMS</p>
          <h1>Операційний центр</h1>
        </header>
        <nav className={styles.navigation} aria-label="Internal Operations">
          <Link href="/internal/orders">Замовлення</Link>
          <Link href="/internal/returns">Повернення</Link>
          <Link href="/internal/activity">ActivityLog</Link>
          <AdminNavigation />
        </nav>
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </InternalAccessBoundary>
  );
}

export function AdminAccessBoundary({ children }: { children: ReactNode }) {
  return (
    <InternalAccessBoundary allowedRoles={["ADMIN"]}>
      <main id="main-content" className={styles.shell}>
        {children}
      </main>
    </InternalAccessBoundary>
  );
}

function AdminNavigation() {
  const session = useQuery(sessionQueryOptions());
  return session.data?.user.role === "ADMIN" ? (
    <Link href="/admin/moderation">Модерація</Link>
  ) : null;
}

function InternalAccessBoundary({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly UserRole[];
  children: ReactNode;
}) {
  const session = useQuery(sessionQueryOptions());
  if (session.isPending) {
    return <AccessState message="Перевіряємо internal session…" />;
  }
  if (session.isError) {
    return (
      <AccessState
        title="Не вдалося перевірити сесію"
        message="Оновіть дані сесії та повторіть спробу."
        action={
          <Button type="button" variant="outline" onClick={() => void session.refetch()}>
            Спробувати ще раз
          </Button>
        }
      />
    );
  }
  if (!session.data) {
    return (
      <AccessState
        title="Потрібен вхід"
        message="Увійдіть під дозволеною internal роллю."
        action={<Link href="/sign-in?returnTo=%2Finternal%2Forders">Увійти</Link>}
      />
    );
  }
  if (!session.data.user.isActive) {
    return <AccessState title="Акаунт неактивний" message="Internal workspace недоступний." />;
  }
  if (!allowedRoles.includes(session.data.user.role)) {
    return (
      <AccessState
        title="Доступ заборонено"
        message="Поточна роль не має доступу до цього internal workspace."
      />
    );
  }
  return children;
}

function AccessState({
  title = "Завантаження",
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <main id="main-content" className={styles.shell}>
      <section className={styles.state} aria-labelledby="internal-access-title">
        <h1 id="internal-access-title">{title}</h1>
        <p role={title === "Завантаження" ? "status" : undefined}>{message}</p>
        {action}
      </section>
    </main>
  );
}
