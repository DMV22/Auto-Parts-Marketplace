"use client";

import { useQuery } from "@tanstack/react-query";
import { type ChangeEvent, type ReactNode, useId } from "react";
import {
  engineTypesQueryOptions,
  vehicleGenerationsQueryOptions,
  vehicleMakesQueryOptions,
  vehicleModelsQueryOptions,
  vehicleYearsQueryOptions,
} from "@/lib/query/vehicle-queries";
import {
  type VehicleSelection,
  type VehicleSelectionField,
  updateVehicleSelection,
} from "@/lib/vehicles/vehicle-selector-state";
import styles from "./VehicleSelector.module.css";

type VehicleSelectorProps = {
  value: VehicleSelection;
  onChange: (selection: VehicleSelection) => void;
  disabled?: boolean;
};

type SelectorFieldProps = {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  placeholder: string;
  children?: ReactNode;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

function SelectorField({
  id,
  label,
  value,
  disabled,
  placeholder,
  children,
  onChange,
}: SelectorFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}

export function VehicleSelector({
  value,
  onChange,
  disabled = false,
}: VehicleSelectorProps) {
  const idPrefix = useId();
  const years = useQuery(vehicleYearsQueryOptions());
  const makes = useQuery(vehicleMakesQueryOptions(value.year));
  const models = useQuery(vehicleModelsQueryOptions(value.year, value.makeId));
  const generations = useQuery(
    vehicleGenerationsQueryOptions(value.year, value.modelId),
  );
  const engines = useQuery(engineTypesQueryOptions(value.generationId));

  function update<Field extends VehicleSelectionField>(
    field: Field,
    nextValue: VehicleSelection[Field],
  ) {
    onChange(updateVehicleSelection(value, field, nextValue));
  }

  const activeQuery = value.generationId
    ? engines
    : value.modelId
      ? generations
      : value.makeId
        ? models
        : value.year
          ? makes
          : years;

  return (
    <fieldset className={styles.selector} disabled={disabled}>
      <legend>Оберіть автомобіль</legend>
      <div className={styles.grid}>
        <SelectorField
          id={`${idPrefix}-vehicle-year`}
          label="Рік"
          value={value.year?.toString() ?? ""}
          disabled={disabled || years.isPending || years.isError}
          placeholder={years.isPending ? "Завантаження…" : "Оберіть рік"}
          onChange={(event) =>
            update(
              "year",
              event.target.value ? Number(event.target.value) : null,
            )
          }
        >
          {years.data?.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectorField>

        <SelectorField
          id={`${idPrefix}-vehicle-make`}
          label="Марка"
          value={value.makeId ?? ""}
          disabled={disabled || value.year === null || makes.isPending || makes.isError}
          placeholder={
            value.year === null
              ? "Спочатку оберіть рік"
              : makes.data?.length === 0
                ? "Марок не знайдено"
                : "Оберіть марку"
          }
          onChange={(event) => update("makeId", event.target.value || null)}
        >
          {makes.data?.map((make) => (
            <option key={make.id} value={make.id}>
              {make.name}
            </option>
          ))}
        </SelectorField>

        <SelectorField
          id={`${idPrefix}-vehicle-model`}
          label="Модель"
          value={value.modelId ?? ""}
          disabled={disabled || value.makeId === null || models.isPending || models.isError}
          placeholder={
            value.makeId === null
              ? "Спочатку оберіть марку"
              : models.data?.length === 0
                ? "Моделей не знайдено"
                : "Оберіть модель"
          }
          onChange={(event) => update("modelId", event.target.value || null)}
        >
          {models.data?.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </SelectorField>

        <SelectorField
          id={`${idPrefix}-vehicle-generation`}
          label="Покоління"
          value={value.generationId ?? ""}
          disabled={
            disabled ||
            value.modelId === null ||
            generations.isPending ||
            generations.isError
          }
          placeholder={
            value.modelId === null
              ? "Спочатку оберіть модель"
              : generations.data?.length === 0
                ? "Поколінь не знайдено"
                : "Оберіть покоління"
          }
          onChange={(event) =>
            update("generationId", event.target.value || null)
          }
        >
          {generations.data?.map((generation) => (
            <option key={generation.id} value={generation.id}>
              {generation.name ?? generation.code} ({generation.yearFrom}–
              {generation.yearTo})
            </option>
          ))}
        </SelectorField>

        <SelectorField
          id={`${idPrefix}-vehicle-engine`}
          label="Двигун"
          value={value.engineTypeId ?? ""}
          disabled={
            disabled ||
            value.generationId === null ||
            engines.isPending ||
            engines.isError ||
            engines.data?.length === 0
          }
          placeholder={
            value.generationId === null
              ? "Спочатку оберіть покоління"
              : engines.data?.length === 0
                ? "Двигуни не вказані"
                : "Оберіть двигун"
          }
          onChange={(event) =>
            update("engineTypeId", event.target.value || null)
          }
        >
          {engines.data?.map((engine) => (
            <option key={engine.id} value={engine.id}>
              {engine.name} ({engine.code})
            </option>
          ))}
        </SelectorField>
      </div>

      {activeQuery.isPending ? (
        <p className={styles.status} role="status">
          {value.year === null
            ? "Завантажуємо роки…"
            : "Завантажуємо доступні варіанти…"}
        </p>
      ) : activeQuery.isError ? (
        <div className={styles.error} role="alert">
          <p>Не вдалося завантажити дані автомобілів.</p>
          <button type="button" onClick={() => void activeQuery.refetch()}>
            Спробувати ще раз
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
