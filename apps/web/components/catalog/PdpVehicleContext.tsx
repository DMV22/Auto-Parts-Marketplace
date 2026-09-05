import Link from "next/link";
import { VehicleContextRail } from "@/components/vehicles/VehicleContextRail";
import type { CatalogVehicleContextModel } from "./useCatalogVehicleContext";

export function PdpVehicleContext({
  model,
}: Readonly<{ model: CatalogVehicleContextModel }>) {
  if (model.kind === "loading") {
    return (
      <VehicleContextRail
        label="Перевірка сумісності"
        status={{
          tone: "info",
          title: "Завантажуємо активне авто",
          description: "Готуємо точну перевірку для кожної модифікації.",
        }}
        live
      />
    );
  }

  if (model.kind === "error") {
    return (
      <VehicleContextRail
        label="Перевірка сумісності"
        status={{
          tone: "warning",
          title: "Авто не вдалося застосувати",
          description: "Показуємо результат без контексту автомобіля.",
        }}
        action={<Link href="/garage">Перевірити гараж</Link>}
      />
    );
  }

  if (model.kind === "empty") {
    return (
      <VehicleContextRail
        label="Перевірка сумісності"
        status={{
          tone: "neutral",
          title: "Автомобіль не вибрано",
          description: "Оберіть авто, щоб перевірити кожну модифікацію.",
        }}
        action={<Link href="/garage">Вибрати автомобіль</Link>}
      />
    );
  }

  return (
    <VehicleContextRail
      vehicle={model.vehicle}
      label="Перевірка сумісності"
      status={
        model.filtering
          ? {
              tone: "info",
              title: "Авто застосовано до перевірки",
              description: "Результат нижче є окремим для кожної модифікації.",
            }
          : {
              tone: "neutral",
              title: "Перевірка без автомобіля",
              description: "Fitment не підтверджується без vehicle context.",
            }
      }
      action={
        <button type="button" onClick={model.onToggle}>
          {model.filtering
            ? "Показати без авто"
            : "Перевірити для цього авто"}
        </button>
      }
      live
    />
  );
}
