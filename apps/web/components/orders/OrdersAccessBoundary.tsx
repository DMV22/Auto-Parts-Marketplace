"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./orders.module.css";

export function OrdersAccessBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const session = useQuery(sessionQueryOptions());

  if (session.isPending) {
    return <p role="status">Перевіряємо доступ до замовлень…</p>;
  }

  if (session.isError) {
    return (
      <section className={styles.state} aria-labelledby="orders-session-error">
        <h2 id="orders-session-error">Не вдалося перевірити сесію</h2>
        <p role="alert">Оновіть стан сесії та повторіть спробу.</p>
        <Button type="button" variant="outline" onClick={() => void session.refetch()}>
          Спробувати ще раз
        </Button>
      </section>
    );
  }

  if (
    session.data?.user.isActive &&
    session.data.user.role !== "CUSTOMER"
  ) {
    return (
      <section className={styles.state} aria-labelledby="orders-denied">
        <h2 id="orders-denied">Замовлення покупця недоступні</h2>
        <p>Розділ призначений для Customer або поточного Guest context.</p>
        <Link href="/">Повернутися на головну</Link>
      </section>
    );
  }

  return children;
}
