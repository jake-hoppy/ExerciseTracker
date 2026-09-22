import { describe, expect, it } from "vitest";
import { orderItems, topItems } from "./items";

const item = (name: string, timesUsed: number, lastUsed: string | null, archived = false) => ({
  name,
  timesUsed,
  lastUsed: lastUsed ? new Date(lastUsed) : null,
  archived,
});

describe("orderItems", () => {
  it("puts the most-used first, not alphabetical", () => {
    const out = orderItems([item("Apple", 1, null), item("Konala bowl", 9, null)]);
    expect(out.map((i) => i.name)).toEqual(["Konala bowl", "Apple"]);
  });

  it("breaks ties by most recently used, never-used last", () => {
    const out = orderItems([
      item("Never", 3, null),
      item("Older", 3, "2026-09-01T12:00:00Z"),
      item("Newer", 3, "2026-09-20T12:00:00Z"),
    ]);
    expect(out.map((i) => i.name)).toEqual(["Newer", "Older", "Never"]);
  });

  it("drops archived items", () => {
    const out = orderItems([item("Gone", 50, null, true), item("Here", 1, null)]);
    expect(out.map((i) => i.name)).toEqual(["Here"]);
  });

  it("does not mutate its input", () => {
    const input = [item("B", 1, null), item("A", 2, null)];
    orderItems(input);
    expect(input[0].name).toBe("B");
  });
});

describe("topItems", () => {
  it("takes the first six by default", () => {
    const ordered = Array.from({ length: 10 }, (_, i) => item(`i${i}`, 10 - i, null));
    expect(topItems(ordered).map((i) => i.name)).toEqual(["i0", "i1", "i2", "i3", "i4", "i5"]);
  });

  it("returns fewer when fewer exist", () => {
    expect(topItems([item("only", 1, null)])).toHaveLength(1);
  });
});
