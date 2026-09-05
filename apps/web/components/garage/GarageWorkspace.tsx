"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/api/app-error";
import {
  activateGarageVehicle,
  createGarageVehicle,
  deleteGarageVehicle,
} from "@/lib/garage/garage-api";
import type { CreateGarageVehicleInput } from "@/lib/garage/garage-types";
import { garageVehiclesQueryOptions } from "@/lib/query/garage-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { GarageVehicleForm } from "./GarageVehicleForm";
import { SavedVehicleCard } from "./SavedVehicleCard";
import styles from "./GarageWorkspace.module.css";

function operationError(error: unknown): string {
  if (error instanceof AppError) {
    if (error.kind === "conflict") {
      return "Такий автомобіль уже є у вашому гаражі.";
    }
    if (error.kind === "not_found") {
      return "Автомобіль не знайдено або він більше недоступний. Оновіть список.";
    }
    if (error.kind === "unauthenticated") {
      return "Сесія завершилася. Увійдіть повторно.";
    }
    if (error.kind === "validation") {
      return "Перевірте вибрану комплектацію та спробуйте ще раз.";
    }
  }

  return "Не вдалося оновити гараж. Спробуйте ще раз.";
}

export function GarageWorkspace() {
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();
  const garage = useQuery(garageVehiclesQueryOptions());
  const refreshGarage = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.garage.vehicles });
  const createVehicle = useMutation({
    mutationFn: (input: CreateGarageVehicleInput) => createGarageVehicle(input),
    onSuccess: async () => {
      await refreshGarage();
      setIsAdding(false);
    },
  });
  const activateVehicle = useMutation({
    mutationFn: activateGarageVehicle,
    onSuccess: refreshGarage,
    onError: (error) => {
      if (error instanceof AppError && error.kind === "not_found") {
        void refreshGarage();
      }
    },
  });
  const removeVehicle = useMutation({
    mutationFn: deleteGarageVehicle,
    onSuccess: refreshGarage,
    onError: (error) => {
      if (error instanceof AppError && error.kind === "not_found") {
        void refreshGarage();
      }
    },
  });
  const mutationError =
    createVehicle.error ?? activateVehicle.error ?? removeVehicle.error;
  const activeVehicle = garage.data?.find((vehicle) => vehicle.isActive) ?? null;
  const savedVehicles = garage.data?.filter((vehicle) => !vehicle.isActive) ?? [];

  function startAdding() {
    createVehicle.reset();
    activateVehicle.reset();
    removeVehicle.reset();
    setIsAdding(true);
  }

  function activate(id: string) {
    activateVehicle.reset();
    removeVehicle.reset();
    activateVehicle.mutate(id);
  }

  function remove(id: string) {
    activateVehicle.reset();
    removeVehicle.reset();
    removeVehicle.mutate(id);
  }

  if (garage.isPending) {
    return (
      <p className={styles.state} role="status">
        Завантажуємо ваші автомобілі…
      </p>
    );
  }

  if (garage.isError) {
    const signedOut =
      garage.error instanceof AppError && garage.error.kind === "unauthenticated";

    return (
      <section className={styles.state} aria-labelledby="garage-load-error">
        <h2 id="garage-load-error">
          {signedOut ? "Сесія завершилася" : "Не вдалося завантажити гараж"}
        </h2>
        <p>
          {signedOut
            ? "Увійдіть повторно, щоб побачити збережені автомобілі."
            : "Перевірте з’єднання та повторіть запит."}
        </p>
        {signedOut ? (
          <Link href="/sign-in?returnTo=%2Fgarage">Увійти</Link>
        ) : (
          <Button type="button" variant="outline" onClick={() => void garage.refetch()}>
            Спробувати ще раз
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className={styles.workspace} aria-label="Керування гаражем">
      <div className={styles.toolbar}>
        <div>
          <h2 id="saved-vehicles-heading">Збережені автомобілі</h2>
          <p>{garage.data.length} у гаражі</p>
        </div>
        {!isAdding ? (
          <Button type="button" onClick={startAdding}>
            Додати автомобіль
          </Button>
        ) : null}
      </div>

      {mutationError && !createVehicle.error ? (
        <p className={styles.error} role="alert">
          {operationError(mutationError)}
        </p>
      ) : null}

      {activeVehicle ? (
        <section className={styles.activeSection} aria-labelledby="active-vehicle-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p>Контекст сумісності</p>
              <h2 id="active-vehicle-heading">Активне авто</h2>
            </div>
            <span>Одне авто може бути активним одночасно</span>
          </div>
          <SavedVehicleCard
            vehicle={activeVehicle}
            variant="featured"
            isActivating={false}
            isDeleting={
              removeVehicle.isPending && removeVehicle.variables === activeVehicle.id
            }
            onActivate={activate}
            onDelete={remove}
          />
        </section>
      ) : null}

      {garage.data.length === 0 ? (
        <div className={styles.empty}>
          <h3>Гараж поки порожній</h3>
          <p>Додайте автомобіль, щоб зберегти його точну комплектацію.</p>
        </div>
      ) : (
        <section className={styles.savedSection} aria-labelledby="other-vehicles-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p>{savedVehicles.length} неактивних</p>
              <h2 id="other-vehicles-heading">Інші автомобілі</h2>
            </div>
          </div>
          {savedVehicles.length === 0 ? (
            <p className={styles.compactEmpty}>
              Інших автомобілів немає. Додайте ще один, якщо користуєтеся кількома авто.
            </p>
          ) : (
            <div className={styles.list}>
              {savedVehicles.map((vehicle) => (
                <SavedVehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  variant="compact"
                  isActivating={
                    activateVehicle.isPending && activateVehicle.variables === vehicle.id
                  }
                  isDeleting={
                    removeVehicle.isPending && removeVehicle.variables === vehicle.id
                  }
                  onActivate={activate}
                  onDelete={remove}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {isAdding ? (
        <section className={styles.formPanel} aria-labelledby="add-vehicle-heading">
          <div className={styles.formHeading}>
            <p>Точна комплектація</p>
            <h2 id="add-vehicle-heading">Додати автомобіль</h2>
          </div>
          <GarageVehicleForm
            isPending={createVehicle.isPending}
            errorMessage={
              createVehicle.error ? operationError(createVehicle.error) : null
            }
            onCancel={() => {
              createVehicle.reset();
              setIsAdding(false);
            }}
            onCreate={(input) => createVehicle.mutateAsync(input).then(() => undefined)}
          />
        </section>
      ) : null}
    </section>
  );
}
