import { describe, expect, it } from "vitest";
import { dayTotals, remaining } from "./totals";

describe("dayTotals", () => {
  it("is null, not zero, for a day with no entries", () => {
    expect(dayTotals([])).toEqual({ calories: null, protein: null });
  });

  it("sums every entry", () => {
    // Burrito bowl 751/54 + Core Power 240/42 + a quick-add 800/0.
    expect(
      dayTotals([
        { calories: 751, protein: 54 },
        { calories: 240, protein: 42 },
        { calories: 800, protein: 0 },
      ]),
    ).toEqual({ calories: 1791, protein: 96 });
  });

  it("keeps a genuinely logged zero as zero", () => {
    expect(dayTotals([{ calories: 0, protein: 0 }])).toEqual({
      calories: 0,
      protein: 0,
    });
  });
});

describe("remaining", () => {
  it("is what's left when under target", () => {
    expect(remaining(991, 2100)).toEqual({ kind: "left", amount: 1109 });
  });

  it("is over when past target", () => {
    expect(remaining(2220, 2100)).toEqual({ kind: "over", amount: 120 });
  });

  it("treats exactly on target as 0 left, not over", () => {
    expect(remaining(2100, 2100)).toEqual({ kind: "left", amount: 0 });
  });

  it("is the whole target when nothing is logged (empty is not zero, R6)", () => {
    expect(remaining(null, 2100)).toEqual({ kind: "left", amount: 2100 });
  });

  it("is none when there is no target (R6b: never a hardcoded number)", () => {
    expect(remaining(991, null)).toEqual({ kind: "none" });
    expect(remaining(null, null)).toEqual({ kind: "none" });
  });
});
