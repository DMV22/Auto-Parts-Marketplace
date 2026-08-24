"use client";

import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { VehicleSelector } from "@/components/vehicles/VehicleSelector";
import { Button } from "@/components/ui/button";
import type { CreateGarageVehicleInput } from "@/lib/garage/garage-types";
import { engineTypesQueryOptions } from "@/lib/query/vehicle-queries";
import {
  createEmptyVehicleSelection,
  type VehicleSelection,
} from "@/lib/vehicles/vehicle-selector-state";
import styles from "./GarageVehicleForm.module.css";

type GarageVehicleFormProps = {
  isPending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onCreate: (input: CreateGarageVehicleInput) => Promise<void>;
};

export function GarageVehicleForm({
  isPending,
  errorMessage,
  onCancel,
  onCreate,
}: GarageVehicleFormProps) {
  const [selection, setSelection] = useState<VehicleSelection>(
    createEmptyVehicleSelection,
  );
  const [label, setLabel] = useState("");
  const labelHelpId = useId();
  const engines = useQuery(engineTypesQueryOptions(selection.generationId));
  const hasEngineChoices = (engines.data?.length ?? 0) > 0;
  const isExactSelection =
    selection.year !== null &&
    selection.makeId !== null &&
    selection.modelId !== null &&
    selection.generationId !== null &&
    engines.isSuccess &&
    (!hasEngineChoices || selection.engineTypeId !== null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isExactSelection || selection.year === null || !selection.generationId) {
      return;
    }

    await onCreate({
      year: selection.year,
      vehicleGenerationId: selection.generationId,
      engineTypeId: selection.engineTypeId,
      label: label.trim() || null,
    }).catch(() => undefined);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <VehicleSelector
        value={selection}
        onChange={setSelection}
        disabled={isPending}
      />

      <div className={styles.labelField}>
        <label htmlFor="garage-vehicle-label">Назва в гаражі</label>
        <input
          id="garage-vehicle-label"
          name="label"
          type="text"
          autoComplete="off"
          maxLength={80}
          aria-describedby={labelHelpId}
          value={label}
          disabled={isPending}
          placeholder="Наприклад, Сімейне авто…"
          onChange={(event) => setLabel(event.target.value)}
        />
        <p id={labelHelpId}>Необов’язково, до 80 символів.</p>
      </div>

      {!isExactSelection && selection.generationId !== null && engines.isSuccess ? (
        <p className={styles.hint} role="status">
          {hasEngineChoices
            ? "Оберіть двигун, щоб зберегти точну комплектацію."
            : "Для цього покоління двигуни не вказані — авто можна зберегти без них."}
        </p>
      ) : null}

      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" disabled={!isExactSelection || isPending}>
          {isPending ? "Зберігаємо…" : "Зберегти автомобіль"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}
