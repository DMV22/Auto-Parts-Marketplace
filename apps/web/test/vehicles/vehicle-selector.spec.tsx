import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { VehicleSelector } from "@/components/vehicles/VehicleSelector";
import { createQueryClient } from "@/lib/query/query-client";
import {
  createEmptyVehicleSelection,
  type VehicleSelection,
} from "@/lib/vehicles/vehicle-selector-state";
import { mockApi } from "../mocks/server";

const MAKE_ID = "11111111-1111-4111-8111-111111111111";
const MODEL_ID = "22222222-2222-4222-8222-222222222222";
const GENERATION_ID = "33333333-3333-4333-8333-333333333333";
const ENGINE_ID = "44444444-4444-4444-8444-444444444444";

function SelectorHarness() {
  const [selection, setSelection] = useState<VehicleSelection>(
    createEmptyVehicleSelection,
  );

  return <VehicleSelector value={selection} onChange={setSelection} />;
}

describe("VehicleSelector", () => {
  it("loads the canonical cascade, selects a vehicle and resets stale downstream values", async () => {
    const requestedMakeYears: string[] = [];

    mockApi.use(
      http.get("*/api/v1/vehicles/years", async () => {
        await delay(20);
        return HttpResponse.json({ data: [2021, 2020] });
      }),
      http.get("*/api/v1/vehicles/makes", ({ request }) => {
        requestedMakeYears.push(
          new URL(request.url).searchParams.get("year") ?? "",
        );
        return HttpResponse.json({ data: [{ id: MAKE_ID, name: "Toyota" }] });
      }),
      http.get("*/api/v1/vehicles/models", () =>
        HttpResponse.json({ data: [{ id: MODEL_ID, name: "Corolla" }] }),
      ),
      http.get("*/api/v1/vehicles/generations", () =>
        HttpResponse.json({
          data: [
            {
              id: GENERATION_ID,
              code: "E210",
              name: "XII",
              yearFrom: 2018,
              yearTo: 2022,
            },
          ],
        }),
      ),
      http.get("*/api/v1/vehicles/engines", () =>
        HttpResponse.json({
          data: [{ id: ENGINE_ID, code: "M20A", name: "2.0 Hybrid" }],
        }),
      ),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SelectorHarness />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Рік")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Завантажуємо роки");

    await screen.findByRole("option", { name: "2020" });
    await waitFor(() => expect(screen.getByLabelText("Рік")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Рік"), {
      target: { value: "2020" },
    });
    await screen.findByRole("option", { name: "Toyota" });
    fireEvent.change(screen.getByLabelText("Марка"), {
      target: { value: MAKE_ID },
    });
    await screen.findByRole("option", { name: "Corolla" });
    fireEvent.change(screen.getByLabelText("Модель"), {
      target: { value: MODEL_ID },
    });
    await screen.findByRole("option", { name: "XII (2018–2022)" });
    fireEvent.change(screen.getByLabelText("Покоління"), {
      target: { value: GENERATION_ID },
    });
    await screen.findByRole("option", { name: "2.0 Hybrid (M20A)" });
    fireEvent.change(screen.getByLabelText("Двигун"), {
      target: { value: ENGINE_ID },
    });

    expect(screen.getByLabelText("Двигун")).toHaveValue(ENGINE_ID);
    expect(requestedMakeYears).toContain("2020");

    fireEvent.change(screen.getByLabelText("Рік"), {
      target: { value: "2021" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Марка")).toHaveValue("");
      expect(screen.getByLabelText("Модель")).toBeDisabled();
      expect(screen.getByLabelText("Покоління")).toBeDisabled();
      expect(screen.getByLabelText("Двигун")).toBeDisabled();
    });
  });
});
