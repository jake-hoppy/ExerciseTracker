import { describe, expect, it } from "vitest";
import { groupByMonth, monthLabel } from "./months";

describe("monthLabel", () => {
  it("names the month and year", () => {
    expect(monthLabel("2026-09-21")).toBe("September 2026");
    expect(monthLabel("2027-01-03")).toBe("January 2027");
  });
});

describe("groupByMonth", () => {
  it("groups rows by calendar month, newest month and newest day first", () => {
    const rows = [
      { date: "2026-08-30" },
      { date: "2026-09-01" },
      { date: "2026-09-21" },
      { date: "2026-08-13" },
    ];
    expect(groupByMonth(rows)).toEqual([
      { label: "September 2026", rows: [{ date: "2026-09-21" }, { date: "2026-09-01" }] },
      { label: "August 2026", rows: [{ date: "2026-08-30" }, { date: "2026-08-13" }] },
    ]);
  });

  it("keeps months in different years apart", () => {
    const groups = groupByMonth([{ date: "2026-09-05" }, { date: "2025-09-05" }]);
    expect(groups.map((g) => g.label)).toEqual(["September 2026", "September 2025"]);
  });

  it("is empty for no rows", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
