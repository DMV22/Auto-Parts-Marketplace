import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { mockApi } from "./mocks/server";

beforeAll(() => mockApi.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  mockApi.resetHandlers();
});

afterAll(() => mockApi.close());
