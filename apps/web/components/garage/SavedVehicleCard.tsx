"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { GarageVehicle } from "@/lib/garage/garage-types";
import styles from "./SavedVehicleCard.module.css";

type SavedVehicleCardProps = {
  vehicle: GarageVehicle;
  isActivating: boolean;
  isDeleting: boolean;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function SavedVehicleCard({
  vehicle,
  isActivating,
  isDeleting,
  onActivate,
  onDelete,
}: SavedVehicleCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const title = `${vehicle.generation.model.make.name} ${vehicle.generation.model.name}`;
  const confirmationId = `delete-confirmation-${vehicle.id}`;

  function cancelDelete() {
    deleteTriggerRef.current?.focus();
    setIsConfirmingDelete(false);
  }

  return (
    <article
      className={styles.card}
      data-active={vehicle.isActive}
      aria-labelledby={`vehicle-${vehicle.id}`}
    >
      <div className={styles.media}>
        <Image
          src="/images/vehicles/generic-workshop-vehicle.webp"
          alt=""
          width={1280}
          height={720}
          sizes="(max-width: 767px) 100vw, 24rem"
        />
        {vehicle.isActive ? (
          <span className={styles.active}>Активне авто</span>
        ) : null}
      </div>

      <div className={styles.heading}>
        <p>{vehicle.label ?? "Збережений автомобіль"}</p>
        <h3 id={`vehicle-${vehicle.id}`}>{title}</h3>
      </div>

      <dl className={styles.details}>
        <div>
          <dt>Рік</dt>
          <dd>{vehicle.year}</dd>
        </div>
        <div>
          <dt>Покоління</dt>
          <dd>{vehicle.generation.name ?? vehicle.generation.code}</dd>
        </div>
        <div>
          <dt>Двигун</dt>
          <dd>{vehicle.engine?.name ?? "Не вказано"}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        {!vehicle.isActive ? (
          <Button
            type="button"
            variant="outline"
            disabled={isActivating || isDeleting}
            onClick={() => onActivate(vehicle.id)}
          >
            {isActivating ? "Активуємо…" : "Зробити активним"}
          </Button>
        ) : null}
        <Button
          ref={deleteTriggerRef}
          type="button"
          variant="destructive"
          disabled={isActivating || isDeleting}
          aria-expanded={isConfirmingDelete}
          aria-controls={confirmationId}
          onClick={() => setIsConfirmingDelete(true)}
        >
          Видалити
        </Button>
      </div>

      {isConfirmingDelete ? (
        <div
          id={confirmationId}
          className={styles.confirmation}
          role="group"
          aria-label="Підтвердження видалення"
        >
          <p>Видалити цей автомобіль із гаража?</p>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={() => onDelete(vehicle.id)}
          >
            {isDeleting ? "Видаляємо…" : "Так, видалити"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={cancelDelete}
          >
            Не видаляти
          </Button>
        </div>
      ) : null}
    </article>
  );
}
