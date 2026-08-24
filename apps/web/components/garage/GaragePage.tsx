"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { GarageWorkspace } from "./GarageWorkspace";
import styles from "./GaragePage.module.css";

export function GaragePage() {
  const session = useQuery(sessionQueryOptions());

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Особистий кабінет</p>
        <h1>Мій гараж</h1>
        <p>
          Збережіть точну комплектацію автомобіля, щоб надалі перевіряти
          сумісність запчастин.
        </p>
      </header>

      {session.isPending ? (
        <p role="status" className={styles.state}>
          Перевіряємо доступ до гаража…
        </p>
      ) : session.isError ? (
        <div role="alert" className={styles.state}>
          <p>Не вдалося перевірити сесію.</p>
          <button type="button" onClick={() => void session.refetch()}>
            Спробувати ще раз
          </button>
        </div>
      ) : !session.data ? (
        <section className={styles.state} aria-labelledby="garage-sign-in">
          <h2 id="garage-sign-in">Увійдіть, щоб користуватися гаражем</h2>
          <p>Гостьовий гараж не зберігається у браузері або базі даних.</p>
          <Link href="/sign-in?returnTo=%2Fgarage">Увійти</Link>
        </section>
      ) : session.data.user.role !== "CUSTOMER" ||
        !session.data.user.isActive ? (
        <section className={styles.state} aria-labelledby="garage-denied">
          <h2 id="garage-denied">Гараж недоступний</h2>
          <p>Цей розділ доступний лише активному Customer-акаунту.</p>
          <Link href="/">Повернутися на головну</Link>
        </section>
      ) : (
        <GarageWorkspace />
      )}
    </main>
  );
}
