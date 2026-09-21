import { describe, expect, it } from "vitest";
import { addDays, eachDate, isDateString, weekdayIndex } from "./dates";

describe("isDateString", () => {
  it("accepts real calendar dates", () => {
    expect(isDateString("2026-08-13")).toBe(true);
    expect(isDateString("2028-02-29")).toBe(true); // leap year
  });

  it("rejects impossible dates and other shapes", () => {
    expect(isDateString("2026-02-29")).toBe(false);
    expect(isDateString("2026-13-01")).toBe(false);
    expect(isDateString("2026-8-13")).toBe(false);
    expect(isDateString("2026-08-13T06:00:00Z")).toBe(false);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is unaffected by DST transitions", () => {
    // US DST starts 2026-03-08 and ends 2026-11-01.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });
});

describe("weekdayIndex", () => {
  it("reads the weekday of the calendar date", () => {
    // Hand-checked: 13 Aug 2026 is a Thursday, 11 Sep 2026 a Friday.
    expect(weekdayIndex("2026-08-13")).toBe(4);
    expect(weekdayIndex("2026-09-11")).toBe(5);
    expect(weekdayIndex("2026-08-16")).toBe(0);
  });
});

describe("eachDate", () => {
  it("covers the seeded block window inclusively: 30 days", () => {
    const dates = eachDate("2026-08-13", "2026-09-11");
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe("2026-08-13");
    expect(dates[18]).toBe("2026-08-31");
    expect(dates[19]).toBe("2026-09-01");
    expect(dates[29]).toBe("2026-09-11");
  });

  it("handles a one-day range and rejects a backward one", () => {
    expect(eachDate("2026-08-13", "2026-08-13")).toEqual(["2026-08-13"]);
    expect(() => eachDate("2026-08-14", "2026-08-13")).toThrow();
  });
});
