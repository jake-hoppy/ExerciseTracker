import { describe, expect, it } from "vitest";
import { EMPTY, formatAvgLabel, formatDateRange, formatGrams, formatKcal, formatShortDate, formatWeekday, formatWeight } from "./format";

describe("empty values", () => {
  it("render as a dash, never 0", () => {
    expect(formatWeight(null)).toBe(EMPTY);
    expect(formatKcal(null)).toBe(EMPTY);
    expect(formatGrams(undefined)).toBe(EMPTY);
  });

  it("but a real zero is still zero", () => {
    expect(formatKcal(0)).toBe("0");
  });
});

describe("numbers", () => {
  it("formats each unit", () => {
    expect(formatWeight(178.2)).toBe("178.2");
    expect(formatWeight(178)).toBe("178.0");
    expect(formatKcal(2100)).toBe("2,100");
    expect(formatGrams(150)).toBe("150");
  });
});

describe("dates", () => {
  it("formats calendar dates without shifting them", () => {
    expect(formatShortDate("2026-08-13")).toBe("Aug 13");
    expect(formatShortDate("2026-09-01")).toBe("Sep 1");
    expect(formatWeekday("2026-08-13")).toBe("Thu");
  });

  it("formats a range", () => {
    expect(formatDateRange("2026-08-13", "2026-09-11")).toBe("Aug 13 – Sep 11, 2026");
    expect(formatDateRange("2026-12-20", "2027-01-18")).toBe("Dec 20, 2026 – Jan 18, 2027");
  });
});

describe("formatAvgLabel", () => {
  it("names the window by how many readings it holds (R4)", () => {
    expect(formatAvgLabel(7)).toBe("7-day");
    expect(formatAvgLabel(4)).toBe("4-day");
    expect(formatAvgLabel(1)).toBe("1-day");
  });
});
