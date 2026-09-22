import { describe, expect, it } from "vitest";
import {
  anchorAtStart,
  completion,
  currentStreak,
  longestStreak,
  mean,
  rollingAverageSeries,
  statRowFrom,
  weightDelta,
  type StatRow,
} from "./stats";

// A row per calendar date. Only the fields a test cares about are set.
const row = (date: string, over: Partial<StatRow> = {}): StatRow => ({
  date,
  logged: false,
  calories: null,
  protein: null,
  weight: null,
  trained: false,
  isRest: false,
  ...over,
});
const logged = (date: string, over: Partial<StatRow> = {}) => row(date, { logged: true, ...over });

describe("currentStreak (R2)", () => {
  it("counts consecutive logged days back from today", () => {
    const rows = [logged("2026-09-19"), logged("2026-09-20"), logged("2026-09-21")];
    expect(currentStreak(rows, "2026-09-21")).toBe(3);
  });

  it("skips an unlogged today and starts from yesterday", () => {
    const rows = [logged("2026-09-19"), logged("2026-09-20"), row("2026-09-21")];
    expect(currentStreak(rows, "2026-09-21")).toBe(2);
  });

  it("stops at the first unlogged day before today", () => {
    const rows = [logged("2026-09-17"), row("2026-09-18"), logged("2026-09-19"), logged("2026-09-20"), logged("2026-09-21")];
    expect(currentStreak(rows, "2026-09-21")).toBe(3);
  });

  it("is 0 when yesterday is unlogged, whatever today is", () => {
    expect(currentStreak([logged("2026-09-21")], "2026-09-21")).toBe(1);
    expect(currentStreak([row("2026-09-20"), logged("2026-09-21")], "2026-09-21")).toBe(1);
    expect(currentStreak([logged("2026-09-19"), row("2026-09-20"), row("2026-09-21")], "2026-09-21")).toBe(0);
    expect(currentStreak([], "2026-09-21")).toBe(0);
  });

  it("treats a date with no row as unlogged (a silent gap is a miss, R1c)", () => {
    const rows = [logged("2026-09-18"), logged("2026-09-20"), logged("2026-09-21")];
    expect(currentStreak(rows, "2026-09-21")).toBe(2);
  });

  it("counts rest days like any other day (R1: no rest-day exception)", () => {
    const rows = [logged("2026-09-20", { isRest: true }), logged("2026-09-21")];
    expect(currentStreak(rows, "2026-09-21")).toBe(2);
    expect(currentStreak([row("2026-09-20", { isRest: true }), logged("2026-09-21")], "2026-09-21")).toBe(1);
  });
});

describe("longestStreak (R3)", () => {
  it("finds a run that ended weeks ago", () => {
    const rows = [
      logged("2026-08-13"), logged("2026-08-14"), logged("2026-08-15"), logged("2026-08-16"),
      row("2026-08-17"),
      logged("2026-09-20"), logged("2026-09-21"),
    ];
    expect(longestStreak(rows)).toBe(4);
  });

  it("breaks on missing dates, not just unlogged rows", () => {
    expect(longestStreak([logged("2026-09-01"), logged("2026-09-03"), logged("2026-09-04")])).toBe(2);
  });

  it("is 0 with nothing logged", () => {
    expect(longestStreak([row("2026-09-21")])).toBe(0);
    expect(longestStreak([])).toBe(0);
  });
});

describe("mean (R6)", () => {
  it("excludes nulls instead of counting them as zero", () => {
    expect(mean([2100, null, 2300])).toBe(2200);
    expect(mean([2100, 0])).toBe(1050); // a real zero still counts
  });

  it("is null when nothing is logged", () => {
    expect(mean([null, null])).toBeNull();
    expect(mean([])).toBeNull();
  });
});

describe("rollingAverageSeries (R4)", () => {
  const w = (date: string, weight: number | null) => row(date, { weight });

  it("gives every date its trailing 7-calendar-day average", () => {
    const rows = [
      w("2026-09-15", 180.0), w("2026-09-16", 179.6), w("2026-09-17", 179.9), w("2026-09-18", 179.2),
      w("2026-09-19", 178.8), w("2026-09-20", 179.0), w("2026-09-21", 178.2),
    ];
    const series = rollingAverageSeries(rows);
    expect(series.at(-1)).toEqual({ date: "2026-09-21", average: 1254.7 / 7, count: 7 });
    expect(series[0]).toEqual({ date: "2026-09-15", average: 180.0, count: 1 });
  });

  it("uses 7 calendar days, not the last 7 readings, when days are missing", () => {
    // Readings on 9/01, 9/08, 9/15, 9/17, 9/19, 9/20, 9/21: the last 7
    // readings span three weeks; the calendar window 9/15..9/21 holds five.
    const rows = [
      w("2026-09-01", 185.0), w("2026-09-08", 183.0), w("2026-09-15", 181.0),
      w("2026-09-17", 179.9), w("2026-09-19", 178.8), w("2026-09-20", 179.0), w("2026-09-21", 178.2),
    ];
    const last = rollingAverageSeries(rows).at(-1)!;
    const sevenEntries = (185.0 + 183.0 + 181.0 + 179.9 + 178.8 + 179.0 + 178.2) / 7;
    // (181.0 + 179.9 + 178.8 + 179.0 + 178.2) / 5 = 896.9 / 5 = 179.38
    expect(last.date).toBe("2026-09-21");
    expect(last.count).toBe(5);
    expect(last.average).toBeCloseTo(896.9 / 5, 6);
    expect(last.average).not.toBeCloseTo(sevenEntries, 1);
  });

  it("does not let a null-weight day pull the average down", () => {
    const rows = [w("2026-09-19", 180.0), w("2026-09-20", null), w("2026-09-21", 178.0)];
    expect(rollingAverageSeries(rows).at(-1)).toEqual({ date: "2026-09-21", average: 179.0, count: 2 });
  });

  it("is null where there are no readings in the window", () => {
    const rows = [w("2026-09-01", 180.0), w("2026-09-21", null)];
    expect(rollingAverageSeries(rows).at(-1)).toEqual({ date: "2026-09-21", average: null, count: 0 });
  });
});

describe("completion (R5)", () => {
  it("derives every count from the rows, never a fixed number", () => {
    const rows = [
      logged("2026-09-18", { trained: true }),
      logged("2026-09-19", { isRest: true }),
      row("2026-09-20", { trained: true }),
      row("2026-09-21"),
    ];
    expect(completion(rows)).toEqual({
      totalDays: 4,
      trainingDays: 3,
      restDays: 1,
      loggedDays: 2,
      trainedDays: 2,
    });
  });

  it("is all zeros for no rows", () => {
    expect(completion([])).toEqual({ totalDays: 0, trainingDays: 0, restDays: 0, loggedDays: 0, trainedDays: 0 });
  });
});

describe("weightDelta (R4)", () => {
  it("is the change in the rolling average from the first average to the last", () => {
    const series = [
      { date: "2026-09-01", average: 181.0, count: 7 },
      { date: "2026-09-21", average: 178.6, count: 7 },
    ];
    expect(weightDelta(series, null)).toEqual({ delta: -2.4, window: 7 });
  });

  it("anchors at startWeight when the first day has no average", () => {
    const series = [
      { date: "2026-09-01", average: null, count: 0 },
      { date: "2026-09-21", average: 178.6, count: 7 },
    ];
    expect(weightDelta(series, 180.2)).toEqual({ delta: -1.6, window: 7 });
  });

  it("a real first-day average supersedes the anchor", () => {
    const series = [
      { date: "2026-09-01", average: 181.0, count: 1 },
      { date: "2026-09-21", average: 178.6, count: 7 },
    ];
    expect(weightDelta(series, 180.2)).toEqual({ delta: -2.4, window: 7 });
  });

  it("starts from the first available average when the range opens with none and there is no anchor", () => {
    const series = [
      { date: "2026-08-23", average: null, count: 0 },
      { date: "2026-08-24", average: 181.4, count: 1 },
      { date: "2026-09-21", average: 179.0, count: 7 },
    ];
    expect(weightDelta(series, null)).toEqual({ delta: -2.4, window: 7 });
  });

  it("states a short window", () => {
    const series = [
      { date: "2026-09-18", average: 179.0, count: 1 },
      { date: "2026-09-21", average: 178.5, count: 4 },
    ];
    expect(weightDelta(series, null)).toEqual({ delta: -0.5, window: 4 });
  });

  it("is null with nothing to compare", () => {
    expect(weightDelta([{ date: "2026-09-21", average: null, count: 0 }], null)).toBeNull();
    expect(weightDelta([{ date: "2026-09-21", average: 178.5, count: 3 }], null)).toBeNull();
    expect(weightDelta([], 180)).toBeNull();
  });
});

describe("statRowFrom (R1, R6c)", () => {
  it("is logged only when the day has at least one entry, and totals derive from entries", () => {
    expect(statRowFrom("2026-09-21", null, false)).toEqual(row("2026-09-21"));
    expect(statRowFrom("2026-09-21", { weight: 178.2, trained: true, entries: [] }, true)).toEqual(
      row("2026-09-21", { weight: 178.2, trained: true, isRest: true }),
    );
    expect(
      statRowFrom("2026-09-21", { weight: null, trained: false, entries: [{ calories: 751, protein: 54 }] }, false),
    ).toEqual(logged("2026-09-21", { calories: 751, protein: 54 }));
  });
});

describe("anchorAtStart (R4)", () => {
  const w = (date: string, weight: number | null) => row(date, { weight });

  it("anchors day 1 at startWeight when day 1 has no reading", () => {
    const out = anchorAtStart([w("2026-09-01", null), w("2026-09-02", 183.0)], 185.0);
    expect(out.anchored).toBe(true);
    expect(out.rows[0]).toEqual(w("2026-09-01", 185.0));
    expect(out.rows[1]).toEqual(w("2026-09-02", 183.0));
  });

  it("leaves a real day-1 reading alone — never both", () => {
    const rows = [w("2026-09-01", 183.4), w("2026-09-02", 183.0)];
    expect(anchorAtStart(rows, 185.0)).toEqual({ rows, anchored: false });
  });

  it("does nothing without a startWeight or without rows", () => {
    const rows = [w("2026-09-01", null)];
    expect(anchorAtStart(rows, null)).toEqual({ rows, anchored: false });
    expect(anchorAtStart([], 185.0)).toEqual({ rows: [], anchored: false });
  });
});
