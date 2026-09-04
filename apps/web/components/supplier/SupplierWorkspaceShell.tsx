"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { supplierMembershipQueryOptions } from "@/lib/query/supplier-queries";
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
        message="Увійдіть як SupplierUser або Admin."
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
        message="Supplier workspace недоступний для неактивного акаунта."
      />
    );
  }

  const isAdmin = session.data.user.role === "ADMIN";
  if (!isAdmin && session.data.user.role !== "SUPPLIER_USER") {
    return (
      <WorkspaceState
        title="Доступ заборонено"
        message="Цей розділ призначений для SupplierUser або Admin."
      />
    );
  }
  if (!isAdmin && membership.isPending) {
    return <WorkspaceState message="Перевіряємо membership постачальника…" />;
  }
  if (!isAdmin && membership.isError) {
    return (
      <WorkspaceState
        title="Не вдалося перевірити membership"
        message="Дані постачальника тимчасово недоступні."
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
        title="Supplier workspace недоступний"
        message={
          currentMembership?.status === "DISABLED"
            ? "Membership постачальника вимкнено."
            : "Постачальника не знайдено або він не належить поточному користувачу."
        }
      />
    );
  }

  const supplierName = isAdmin
    ? "Admin supplier view"
    : currentMembership?.supplier.name;

  return (
    <div className={styles.shell}>
      <header className={styles.heading}>
        <p>Кабінет постачальника</p>
        <h1>{supplierName}</h1>
      </header>
      <nav className={styles.workspaceNav} aria-label="Кабінет постачальника">
        <Link href={`/supplier/${supplierId}/listings`}>Оголошення</Link>
        <Link href={`/supplier/${supplierId}/inventory`}>Залишки</Link>
        <Link href={`/supplier/${supplierId}/order-items`}>Позиції замовлень</Link>
      </nav>
      <main id="main-content" className={styles.main}>
        {children}
      </main>
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
