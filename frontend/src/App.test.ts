import { describe, expect, it } from "vitest";
import { api } from "./services/api";

describe("api client", () => {
  it("targets the local /api prefix", () => {
    expect(api.defaults.baseURL).toBe("/api");
  });
});
