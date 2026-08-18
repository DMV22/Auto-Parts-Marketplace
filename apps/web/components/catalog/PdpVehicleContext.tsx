import Link from "next/link";
import type { CatalogVehicleContextModel } from "./useCatalogVehicleContext";
import styles from "./PdpVehicleContext.module.css";

export function PdpVehicleContext({
  model,
}: Readonly<{ model: CatalogVehicleContextModel }>) {
  if (model.kind === "loading") {
    return (
      <aside className={styles.panel} aria-labelledby="fitment-context-title">
        <h2 id="fitment-context-title">Перевірка сумісності</h2>
        <p role="status">Перевіряємо активне авто…</p>
      </aside>
    );
  }

  if (model.kind === "error") {
    return (
      <aside className={styles.panel} aria-labelledby="fitment-context-title">
        <h2 id="fitment-context-title">Перевірка сумісності</h2>
        <p>Не вдалося застосувати активне авто. Показуємо результат без vehicle context.</p>
        <Link href="/garage">Перевірити гараж</Link>
      </aside>
    );
  }

  if (model.kind === "empty") {
    return (
      <aside className={styles.panel} aria-labelledby="fitment-context-title">
        <h2 id="fitment-context-title">Перевірка сумісності</h2>
        <p>Оберіть автомобіль у гаражі, щоб отримати точну відповідь для кожної модифікації.</p>
        <Link href="/garage">Вибрати автомобіль</Link>
      </aside>
    );
  }

  const vehicleName = `${model.vehicle.year} ${model.vehicle.generation.model.make.name} ${model.vehicle.generation.model.name}`;
  return (
    <aside className={styles.panel} aria-labelledby="fitment-context-title">
      <h2 id="fitment-context-title">Перевірка сумісності</h2>
      <p>
        {model.filtering ? "Перевіряємо для" : "Активне авто не застосовано"}:{" "}
        <strong>{vehicleName}</strong>
      </p>
      <button type="button" onClick={model.onToggle}>
        {model.filtering
          ? "Показати сумісність без авто"
          : "Перевірити для активного авто"}
      </button>
    </aside>
  );
}
