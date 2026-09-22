import { describe, expect, it } from "vitest";
import { trailingAverage } from "./weight";

const r = (date: string, weight: number) => ({ date, weight });

describe("trailingAverage", () => {
  it("averages the readings in the last 7 calendar days, inclusive", () => {
    const readings = [
      r("2026-09-15", 180.0),
      r("2026-09-16", 179.6),
      r("2026-09-17", 179.9),
      r("2026-09-18", 179.2),
      r("2026-09-19", 178.8),
      r("2026-09-20", 179.0),
      r("2026-09-21", 178.2),
    ];
    // (180.0+179.6+179.9+179.2+178.8+179.0+178.2)/7 = 1254.7/7
    expect(trailingAverage(readings, "2026-09-21")).toEqual({
      average: 1254.7 / 7,
      count: 7,
    });
  });

  it("does not widen the window to find 7 readings (R4)", () => {
    // Only 4 readings inside 2026-09-15..21; the 09-10 one is outside.
    const readings = [
      r("2026-09-10", 185.0),
      r("2026-09-16", 179.6),
      r("2026-09-18", 179.2),
      r("2026-09-20", 179.0),
      r("2026-09-21", 178.2),
    ];
    expect(trailingAverage(readings, "2026-09-21")).toEqual({
      average: (179.6 + 179.2 + 179.0 + 178.2) / 4,
      count: 4,
    });
  });

  it("ignores readings after the date", () => {
    const readings = [r("2026-09-21", 178.2), r("2026-09-22", 177.0)];
    expect(trailingAverage(readings, "2026-09-21")).toEqual({ average: 178.2, count: 1 });
  });

  it("is null with no readings in the window", () => {
    expect(trailingAverage([r("2026-09-01", 180)], "2026-09-21")).toBeNull();
    expect(trailingAverage([], "2026-09-21")).toBeNull();
  });
});
