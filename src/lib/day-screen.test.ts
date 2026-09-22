import { describe, expect, it } from "vitest";
import { routeFor } from "./day-screen";

describe("routeFor", () => {
  it("sends today to / and any other date to /d/<date>", () => {
    expect(routeFor("2026-09-20", "2026-09-21")).toBe("/d/2026-09-20");
    expect(routeFor("2026-09-21", "2026-09-21")).toBe("/");
    expect(routeFor("2026-09-22", "2026-09-21")).toBe("/d/2026-09-22");
  });
});
