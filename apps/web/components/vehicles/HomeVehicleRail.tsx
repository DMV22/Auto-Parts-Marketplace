"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { garageVehiclesQueryOptions } from "@/lib/query/garage-queries";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { VehicleContextRail } from "./VehicleContextRail";

export function HomeVehicleRail() {
  const session = useQuery(sessionQueryOptions());
  const isCustomer =
    session.data?.user.role === "CUSTOMER" && session.data.user.isActive;
  const garage = useQuery({
    ...garageVehiclesQueryOptions(),
    enabled: isCustomer,
  });
  const activeVehicle = garage.data?.find((vehicle) => vehicle.isActive);

  if (session.isPending || (isCustomer && garage.isPending)) {
    return (
      <VehicleContextRail
        label="Ваш автомобіль"
        live
        status={{
          tone: "info",
          title: "Перевіряємо контекст",
          description: "Шукаємо активне авто у вашому гаражі.",
        }}
      />
    );
  }

  if (garage.isError) {
    return (
      <VehicleContextRail
        label="Ваш автомобіль"
        status={{
          tone: "warning",
          title: "Контекст тимчасово недоступний",
          description: "Каталог залишається доступним без фільтра за авто.",
        }}
        action={<Link href="/garage">Відкрити гараж</Link>}
      />
    );
  }

  if (!activeVehicle) {
    return (
      <VehicleContextRail
        label="Ваш автомобіль"
        status={{
          tone: "neutral",
          title: "Додайте точну комплектацію",
          description: "Після вибору ми передамо авто серверу для перевірки сумісності.",
        }}
        action={<Link href="/garage">Налаштувати авто</Link>}
      />
    );
  }

  return (
    <VehicleContextRail
      vehicle={activeVehicle}
      label="Активне авто"
      status={{
        tone: "success",
        title: "Готове до перевірки",
        description: "Використаємо це авто як контекст у каталозі та на сторінці товару.",
      }}
      action={<Link href="/garage">Змінити авто</Link>}
    />
  );
}
