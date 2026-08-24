import type { Metadata } from "next";
import { GaragePage } from "@/components/garage/GaragePage";

export const metadata: Metadata = {
  title: "Мій гараж | Auto Parts Marketplace",
  description: "Збережені автомобілі та активний vehicle context.",
};

export default function Page() {
  return <GaragePage />;
}
