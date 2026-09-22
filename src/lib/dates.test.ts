import { describe, expect, it } from "vitest";
import { addDays, daysBetween, eachDate, isDateString, spanRows, today, weekdayIndex } from "./dates";

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

describe("daysBetween", () => {
  it("counts calendar days, signed", () => {
    expect(daysBetween("2026-08-13", "2026-09-11")).toBe(29);
    expect(daysBetween("2026-09-21", "2026-09-20")).toBe(-1);
    expect(daysBetween("2026-02-28", "2028-02-29")).toBe(731);
  });

  it("is unaffected by DST transitions", () => {
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });
});

describe("today", () => {
  it("reads the calendar date in the home zone, not UTC", () => {
    // 2026-09-22 04:30 UTC is still 22:30 on the 21st in Denver (MDT, UTC-6).
    const lateEvening = new Date("2026-09-22T04:30:00Z");
    expect(today("America/Denver", lateEvening)).toBe("2026-09-21");
    expect(today("UTC", lateEvening)).toBe("2026-09-22");
  });
});

describe("spanRows", () => {
  const blank = (date: string) => ({ date, logged: false });

  it("fills every date from the earliest row through the end, keeping real rows (R1c)", () => {
    const rows = [
      { date: "2026-09-19", logged: true },
      { date: "2026-09-21", logged: true },
    ];
    expect(spanRows(rows, "2026-09-22", blank)).toEqual([
      { date: "2026-09-19", logged: true },
      { date: "2026-09-20", logged: false },
      { date: "2026-09-21", logged: true },
      { date: "2026-09-22", logged: false },
    ]);
  });

  it("still includes rows after the end date", () => {
    const rows = [{ date: "2026-09-25", logged: true }];
    expect(spanRows(rows, "2026-09-21", blank).map((r) => r.date)).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25",
    ]);
  });

  it("is just the end date when there are no rows", () => {
    expect(spanRows([], "2026-09-21", blank)).toEqual([{ date: "2026-09-21", logged: false }]);
  });
});
