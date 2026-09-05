"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { supplierMembershipQueryOptions } from "@/lib/query/supplier-queries";
import { SupplierWorkspaceNavigation } from "./SupplierWorkspaceNavigation";
import styles from "./supplier.module.css";

export function SupplierWorkspaceShell({
  supplierId,
  children,
}: Readonly<{ supplierId: string; children: ReactNode }>) {
  const session = useQuery(sessionQueryOptions());
  const membership = useQuery({
    ...supplierMembershipQueryOptions(),
    enabled:
      session.data?.user.role === "SUPPLIER_USER" &&
      session.data.user.isActive,
  });

  if (session.isPending) {
    return <WorkspaceState message="Перевіряємо сесію постачальника…" />;
  }
  if (session.isError) {
    return (
      <WorkspaceState
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
      <WorkspaceState
        title="Потрібен вхід"
        message="Увійдіть як постачальник або адміністратор."
        action={
          <Link href={`/sign-in?returnTo=${encodeURIComponent(`/supplier/${supplierId}/listings`)}`}>
            Увійти
          </Link>
        }
      />
    );
  }
  if (!session.data.user.isActive) {
    return (
      <WorkspaceState
        title="Акаунт неактивний"
        message="Кабінет постачальника недоступний для неактивного акаунта."
      />
    );
  }

  const isAdmin = session.data.user.role === "ADMIN";
  if (!isAdmin && session.data.user.role !== "SUPPLIER_USER") {
    return (
      <WorkspaceState
        title="Доступ заборонено"
        message="Цей розділ призначений для постачальника або адміністратора."
      />
    );
  }
  if (!isAdmin && membership.isPending) {
    return <WorkspaceState message="Перевіряємо доступ постачальника…" />;
  }
  if (!isAdmin && membership.isError) {
    return (
      <WorkspaceState
        title="Не вдалося перевірити доступ"
        message="Дані доступу постачальника тимчасово недоступні."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void membership.refetch()}
          >
            Спробувати ще раз
          </Button>
        }
      />
    );
  }

  const currentMembership = membership.data?.data;
  if (
    !isAdmin &&
    (!currentMembership ||
      currentMembership.status !== "ACTIVE" ||
      currentMembership.supplier.id !== supplierId)
  ) {
    return (
      <WorkspaceState
        title="Кабінет постачальника недоступний"
        message={
          currentMembership?.status === "DISABLED"
            ? "Доступ постачальника вимкнено."
            : "Постачальника не знайдено або він не належить поточному користувачу."
        }
      />
    );
  }

  const supplierName = isAdmin
    ? `Supplier ${supplierId.slice(0, 8)}`
    : currentMembership?.supplier.name;

  return (
    <div className={styles.shell}>
      <SupplierWorkspaceNavigation
        supplierId={supplierId}
        supplierName={supplierName ?? "Постачальник"}
        isAdmin={isAdmin}
      />
      <div className={styles.workspaceFrame}>
        <header className={styles.workspaceHeader}>
          <div>
            <p>Операційний простір</p>
            <h1>{supplierName}</h1>
          </div>
          {isAdmin ? (
            <p className={styles.adminNotice} role="status">
              Адміністратор переглядає дані напряму, без доступу постачальника.
            </p>
          ) : (
            <p className={styles.membershipNotice}>Активний доступ</p>
          )}
        </header>
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}

function WorkspaceState({
  title = "Завантаження",
  message,
  action,
}: Readonly<{ title?: string; message: string; action?: ReactNode }>) {
  return (
    <main id="main-content" className={styles.shell}>
      <section className={styles.state} aria-labelledby="supplier-state-title">
        <h1 id="supplier-state-title">{title}</h1>
        <p role={title === "Завантаження" ? "status" : undefined}>{message}</p>
        {action}
      </section>
    </main>
  );
}
