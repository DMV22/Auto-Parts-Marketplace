import Link from "next/link";
import { VehicleContextRail } from "@/components/vehicles/VehicleContextRail";
import type { CatalogVehicleContextModel } from "./useCatalogVehicleContext";

export function VehicleCatalogContext({
  model,
}: Readonly<{ model: CatalogVehicleContextModel }>) {
  if (model.kind === "loading") {
    return (
      <VehicleContextRail
        label="Контекст каталогу"
        live
        status={{
          tone: "info",
          title: "Перевіряємо активне авто",
          description: "Готуємо коректний контекст для серверного пошуку.",
        }}
      />
    );
  }

  if (model.kind === "error") {
    return (
      <VehicleContextRail
        label="Контекст каталогу"
        status={{
          tone: "warning",
          title: "Активне авто не застосовано",
          description: "Показуємо загальний каталог без фільтра сумісності.",
        }}
        action={<Link href="/garage">Відкрити гараж</Link>}
      />
    );
  }

  if (model.kind === "empty") {
    return (
      <VehicleContextRail
        label="Контекст каталогу"
        status={{
          tone: "neutral",
          title: "Пошук без автомобіля",
          description: "Оберіть авто, щоб сервер відфільтрував сумісні запчастини.",
        }}
        action={<Link href="/garage">Вибрати автомобіль</Link>}
      />
    );
  }

  return (
    <VehicleContextRail
      vehicle={model.vehicle}
      label="Активне авто"
      status={{
        tone: model.filtering ? "success" : "neutral",
        title: model.filtering ? "Фільтр за авто увімкнено" : "Загальний каталог",
        description: model.filtering
          ? "Сервер повертає товари для вибраної комплектації."
          : "Активне авто збережено, але зараз не впливає на результати.",
      }}
      action={
        <button type="button" onClick={model.onToggle}>
          {model.filtering
            ? "Показати всі запчастини"
            : "Фільтрувати для цього авто"}
        </button>
      }
    />
  );
}
