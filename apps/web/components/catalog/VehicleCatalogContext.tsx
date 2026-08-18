import Link from "next/link";
import type { CatalogVehicleContextModel } from "./useCatalogVehicleContext";
import styles from "./CatalogPage.module.css";

export function VehicleCatalogContext({
  model,
}: Readonly<{ model: CatalogVehicleContextModel }>) {
  if (model.kind === "error") {
    return (
      <div className={styles.vehicleContext} role="status">
        <p>Не вдалося застосувати активне авто. Показуємо загальний каталог.</p>
        <Link href="/garage">Відкрити гараж</Link>
      </div>
    );
  }

  if (model.kind === "empty") {
    return (
      <div className={styles.vehicleContext}>
        <p>Оберіть автомобіль, щоб відфільтрувати сумісні запчастини.</p>
        <Link href="/garage">Вибрати автомобіль</Link>
      </div>
    );
  }

  const vehicleName = `${model.vehicle.year} ${model.vehicle.generation.model.make.name} ${model.vehicle.generation.model.name}`;
  return (
    <div className={styles.vehicleContext}>
      <p>
        {model.filtering ? "Каталог відфільтровано для" : "Активне авто"}:{" "}
        <strong>{vehicleName}</strong>
      </p>
      <button type="button" onClick={model.onToggle}>
        {model.filtering
          ? "Показати всі запчастини"
          : "Фільтрувати для цього авто"}
      </button>
    </div>
  );
}
