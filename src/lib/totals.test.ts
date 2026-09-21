import { describe, expect, it } from "vitest";
import { dayTotals } from "./totals";

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
