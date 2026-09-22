import { describe, expect, it } from "vitest";
import { targetsFor, workoutTypeIdFor } from "./schedule";

const cycle = {
  scheduleMode: "cycle",
  pattern: ["push", "pull", "legs", "rest"],
  anchorDate: "2026-09-21",
};

describe("workoutTypeIdFor — cycle", () => {
  it("starts the pattern on the anchor date", () => {
    expect(workoutTypeIdFor("2026-09-21", cycle)).toBe("push");
    expect(workoutTypeIdFor("2026-09-22", cycle)).toBe("pull");
    expect(workoutTypeIdFor("2026-09-24", cycle)).toBe("rest");
    expect(workoutTypeIdFor("2026-09-25", cycle)).toBe("push");
  });

  it("resolves dates far ahead with no generation step", () => {
    // 2026-10-31 is 40 days after the anchor; 40 % 4 = 0.
    expect(workoutTypeIdFor("2026-10-31", cycle)).toBe("push");
    // 2028-03-04 is 530 days after; 530 % 4 = 2.
    expect(workoutTypeIdFor("2028-03-04", cycle)).toBe("legs");
  });

  it("resolves dates before the anchor without a negative index", () => {
    expect(workoutTypeIdFor("2026-09-20", cycle)).toBe("rest"); // -1
    expect(workoutTypeIdFor("2026-09-17", cycle)).toBe("push"); // -4
    expect(workoutTypeIdFor("2026-09-15", cycle)).toBe("legs"); // -6
  });

  it("lets a per-day override win without touching the pattern", () => {
    expect(workoutTypeIdFor("2026-09-21", cycle, "legs")).toBe("legs");
    expect(workoutTypeIdFor("2026-09-22", cycle, null)).toBe("pull");
  });
});

describe("workoutTypeIdFor — weekly", () => {
  const weekly = {
    scheduleMode: "weekly",
    pattern: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    anchorDate: "2026-09-21",
  };

  it("indexes by calendar weekday, Sunday first", () => {
    expect(workoutTypeIdFor("2026-09-21", weekly)).toBe("mon"); // a Monday
    expect(workoutTypeIdFor("2026-09-27", weekly)).toBe("sun");
    expect(workoutTypeIdFor("2026-08-13", weekly)).toBe("thu");
  });
});

describe("targetsFor", () => {
  const settings = { calTarget: 2100, proteinTarget: 150 };

  it("falls back to Settings when no block covers the date", () => {
    expect(targetsFor("2026-09-21", [], settings)).toEqual(settings);
  });

  it("shows no target when nothing sets one", () => {
    expect(targetsFor("2026-09-21", [], null)).toEqual({
      calTarget: null,
      proteinTarget: null,
    });
  });

  it("uses a covering block's targets, inclusive at both ends", () => {
    const cut = {
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      calTarget: 1900,
      proteinTarget: 160,
    };
    expect(targetsFor("2026-10-01", [cut], settings)).toEqual({ calTarget: 1900, proteinTarget: 160 });
    expect(targetsFor("2026-10-31", [cut], settings)).toEqual({ calTarget: 1900, proteinTarget: 160 });
    expect(targetsFor("2026-11-01", [cut], settings)).toEqual(settings);
  });

  it("treats a null endDate as ongoing", () => {
    const open = { startDate: "2026-10-01", endDate: null, calTarget: 2300, proteinTarget: null };
    expect(targetsFor("2027-06-01", [open], settings)).toEqual({ calTarget: 2300, proteinTarget: 150 });
  });

  it("prefers the latest-starting block when blocks overlap", () => {
    // outer's protein (175) differs from settings' (150), so this proves the
    // field falls through to the older covering block before Settings.
    const outer = { startDate: "2026-10-01", endDate: "2026-12-31", calTarget: 2000, proteinTarget: 175 };
    const inner = { startDate: "2026-11-01", endDate: "2026-11-14", calTarget: 1800, proteinTarget: null };
    expect(targetsFor("2026-11-05", [outer, inner], settings)).toEqual({ calTarget: 1800, proteinTarget: 175 });
    expect(targetsFor("2026-10-15", [outer, inner], settings)).toEqual({ calTarget: 2000, proteinTarget: 175 });
  });
});
