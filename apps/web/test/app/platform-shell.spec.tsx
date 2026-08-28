import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import { Button } from "@/components/ui/button";

describe("frontend platform shell", () => {
  it("exposes one semantic main landmark and project heading", () => {
    render(<Home />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Запчастини, сумісні з вашим авто",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Створити акаунт" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    expect(screen.getByRole("link", { name: "Відкрити каталог" })).toHaveAttribute(
      "href",
      "/catalog",
    );
  });

  it("provides an accessible app-local button primitive", () => {
    render(<Button>Продовжити</Button>);

    expect(
      screen.getByRole("button", { name: "Продовжити" }),
    ).toBeEnabled();
  });
});
