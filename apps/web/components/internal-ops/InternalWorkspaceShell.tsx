"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/auth/session";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { InternalWorkspaceNavigation } from "./InternalWorkspaceNavigation";
import styles from "./internal-ops.module.css";

export function InternalWorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <InternalAccessBoundary allowedRoles={["SUPPORT_MANAGER", "ADMIN"]}>
      <InternalWorkspaceFrame>{children}</InternalWorkspaceFrame>
    </InternalAccessBoundary>
  );
}

export function AdminAccessBoundary({ children }: { children: ReactNode }) {
  return (
    <InternalAccessBoundary allowedRoles={["ADMIN"]}>
      <InternalWorkspaceFrame>{children}</InternalWorkspaceFrame>
    </InternalAccessBoundary>
  );
}

function InternalWorkspaceFrame({ children }: { children: ReactNode }) {
  const session = useQuery(sessionQueryOptions());
  if (!session.data) return null;

  return (
    <div className={styles.shell}>
      <InternalWorkspaceNavigation
        name={session.data.user.name}
        role={session.data.user.role}
      />
      <div className={styles.workspaceFrame}>
        <header className={styles.workspaceHeader}>
          <div>
            <p>Операційний простір</p>
            <h1>Внутрішні операції</h1>
          </div>
          <span className={styles.roleNotice}>
            {session.data.user.role === "ADMIN" ? "Admin" : "Support Manager"}
          </span>
        </header>
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
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
    return <AccessState message="Перевіряємо доступ…" />;
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
        message="Увійдіть як менеджер підтримки або адміністратор."
        action={<Link href="/sign-in?returnTo=%2Finternal%2Forders">Увійти</Link>}
      />
    );
  }
  if (!session.data.user.isActive) {
    return <AccessState title="Акаунт неактивний" message="Операційний центр недоступний." />;
  }
  if (!allowedRoles.includes(session.data.user.role)) {
    return (
      <AccessState
        title="Доступ заборонено"
        message="Поточна роль не має доступу до операційного центру."
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
