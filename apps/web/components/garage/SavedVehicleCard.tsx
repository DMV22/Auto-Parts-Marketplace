"use client";

import { CalendarDaysIcon, CircleCheckIcon, GaugeIcon, Layers3Icon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GarageVehicle } from "@/lib/garage/garage-types";
import styles from "./SavedVehicleCard.module.css";

type SavedVehicleCardProps = {
  vehicle: GarageVehicle;
  variant: "featured" | "compact";
  isActivating: boolean;
  isDeleting: boolean;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function SavedVehicleCard({
  vehicle,
  variant,
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
      data-variant={variant}
      data-active={vehicle.isActive}
      aria-labelledby={`vehicle-${vehicle.id}`}
    >
      <div className={styles.media} aria-hidden="true">
        <Image
          src="/images/vehicles/vehicle-silhouette.svg"
          alt=""
          width={640}
          height={280}
          sizes={
            variant === "featured"
              ? "(max-width: 767px) 100vw, 24rem"
              : "(max-width: 767px) 8rem, 11rem"
          }
        />
      </div>

      <div className={styles.content}>
        <div className={styles.heading}>
          <div>
            <p>{vehicle.label ?? "Збережений автомобіль"}</p>
            <h3 id={`vehicle-${vehicle.id}`}>{title}</h3>
          </div>
          {vehicle.isActive ? (
            <span className={styles.active}>
              <CircleCheckIcon aria-hidden="true" />
              Використовується
            </span>
          ) : null}
        </div>

        <dl className={styles.details}>
          <div>
            <dt>
              <CalendarDaysIcon aria-hidden="true" />
              Рік
            </dt>
            <dd>{vehicle.year}</dd>
          </div>
          <div>
            <dt>
              <Layers3Icon aria-hidden="true" />
              Покоління
            </dt>
            <dd>{vehicle.generation.name ?? vehicle.generation.code}</dd>
          </div>
          <div>
            <dt>
              <GaugeIcon aria-hidden="true" />
              Двигун
            </dt>
            <dd>{vehicle.engine?.name ?? "Не вказано"}</dd>
          </div>
        </dl>

        {vehicle.isActive && variant === "featured" ? (
          <p className={styles.contextNote}>
            Використовується як контекст для перевірки сумісності в каталозі.
          </p>
        ) : null}

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
      </div>
    </article>
  );
}
