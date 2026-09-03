import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { Button } from "@/components/ui/button";

vi.mock("@/components/vehicles/HomeVehicleRail", () => ({
  HomeVehicleRail: () => <div data-testid="home-vehicle-rail" />,
}));

describe("frontend platform shell", () => {
  it("exposes one semantic main landmark and project heading", () => {
    const { container } = render(<Home />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Запчастини, що точно підходять вашому авто",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Обрати автомобіль" }),
    ).toHaveAttribute("href", "/garage");
    expect(
      screen.getByRole("link", { name: "Перейти до каталогу" }),
    ).toHaveAttribute("href", "/catalog");
    expect(
      screen.getByRole("region", { name: "Переваги платформи" }),
    ).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll("img")).filter((image) =>
        decodeURIComponent(image.getAttribute("src") ?? "").includes(
          "/images/categories/",
        ),
      ),
    ).toHaveLength(4);
  });

  it("provides an accessible app-local button primitive", () => {
    render(<Button>Продовжити</Button>);

    expect(
      screen.getByRole("button", { name: "Продовжити" }),
    ).toBeEnabled();
  });
});
