import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { GarageWorkspace } from "@/components/garage/GarageWorkspace";
import { createQueryClient } from "@/lib/query/query-client";
import { mockApi } from "../mocks/server";

const SAVED_VEHICLE_ID = "55555555-5555-4555-8555-555555555555";

function garageResponse(isActive: boolean) {
  return {
    data: [
      {
        id: SAVED_VEHICLE_ID,
        year: 2020,
        label: "Щоденне авто",
        isActive,
        generation: {
          id: "33333333-3333-4333-8333-333333333333",
          code: "E210",
          name: "XII",
          yearFrom: 2018,
          yearTo: 2022,
          model: {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Corolla",
            make: {
              id: "11111111-1111-4111-8111-111111111111",
              name: "Toyota",
            },
          },
        },
        engine: {
          id: "44444444-4444-4444-8444-444444444444",
          code: "M20A",
          name: "2.0 Hybrid",
        },
      },
    ],
  };
}

describe("GarageWorkspace", () => {
  it("activates an owned vehicle and refetches the garage context", async () => {
    let isActive = false;
    let listRequests = 0;

    mockApi.use(
      http.get("*/api/v1/garage/vehicles", () => {
        listRequests += 1;
        return HttpResponse.json(garageResponse(isActive));
      }),
      http.put(
        `*/api/v1/garage/vehicles/${SAVED_VEHICLE_ID}/active`,
        () => {
          isActive = true;
          return HttpResponse.json({ data: garageResponse(true).data[0] });
        },
      ),
    );

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <GarageWorkspace />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Toyota Corolla")).toBeVisible();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("vehicle-silhouette.svg"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Зробити активним" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Активне авто" }),
    ).toBeVisible();
    expect(screen.getByText("Використовується")).toBeVisible();
    await waitFor(() => expect(listRequests).toBe(2));
  });
});
