import {
  ArrowRightIcon,
  CreditCardIcon,
  PackageCheckIcon,
  SearchCheckIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HomeVehicleRail } from "@/components/vehicles/HomeVehicleRail";
import styles from "./page.module.css";

const catalogDirections = [
  {
    label: "Гальмівна система",
    image: "/images/categories/braking-system.webp",
  },
  { label: "Фільтри", image: "/images/categories/filters.webp" },
  { label: "Підвіска", image: "/images/categories/suspension.webp" },
  { label: "Двигун", image: "/images/categories/engine.webp" },
] as const;

const trustItems = [
  {
    icon: SearchCheckIcon,
    title: "Перевірка сумісності",
    description: "Результат враховує вибране авто та правила fitment.",
  },
  {
    icon: PackageCheckIcon,
    title: "Актуальна наявність",
    description: "Ціну й доступність перевіряємо перед оформленням.",
  },
  {
    icon: CreditCardIcon,
    title: "Безпечна оплата",
    description: "Статус замовлення оновлюється після перевіреної оплати.",
  },
] as const;

export default function Home() {
  return (
    <main id="main-content" className={styles.main}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Точний підбір за автомобілем</p>
            <h1 id="home-title" className={styles.title}>
              Запчастини, що <span>точно підходять</span> вашому авто
            </h1>
            <p className={styles.description}>
              Оберіть точну комплектацію автомобіля, а система допоможе
              перевірити сумісність доступних пропозицій.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/garage">
                Обрати автомобіль
                <ArrowRightIcon aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryAction} href="/catalog">
                Перейти до каталогу
              </Link>
            </div>
          </div>

          <div className={styles.technicalVisual} aria-hidden="true">
            <div className={styles.visualGrid} />
            <Image
              className={styles.vehicleImage}
              src="/images/vehicles/generic-workshop-vehicle.webp"
              alt=""
              width={1280}
              height={720}
              priority
              sizes="(max-width: 767px) 100vw, 52vw"
            />
            <span className={styles.inspectionLabel}>FITMENT / 01</span>
          </div>
        </div>

        <div className={styles.fitmentRail}>
          <HomeVehicleRail />
        </div>
      </section>

      <section className={styles.catalogDirections} aria-labelledby="directions-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Каталог за системами</p>
            <h2 id="directions-title">Популярні напрями</h2>
          </div>
          <Link href="/catalog">Усі категорії</Link>
        </div>

        <div className={styles.directionGrid}>
          {catalogDirections.map((direction) => (
            <Link
              key={direction.label}
              className={styles.directionLink}
              href="/catalog"
              aria-label={`${direction.label}: відкрити каталог`}
            >
              <span className={styles.directionMedia} aria-hidden="true">
                <Image
                  className={styles.directionImage}
                  src={direction.image}
                  alt=""
                  fill
                  sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw"
                />
              </span>
              <strong>{direction.label}</strong>
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.trustStrip} aria-label="Переваги платформи">
        {trustItems.map(({ icon: Icon, title, description }) => (
          <article key={title}>
            <Icon aria-hidden="true" />
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
