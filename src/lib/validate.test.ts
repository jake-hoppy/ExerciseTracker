import { describe, expect, it } from "vitest";
import {
  caloriesSchema,
  dateSchema,
  nameSchema,
  notesSchema,
  proteinSchema,
  quickAddSchema,
  weightSchema,
} from "./validate";

describe("dateSchema", () => {
  it("accepts a real calendar date and rejects the rest", () => {
    expect(dateSchema.parse("2026-09-21")).toBe("2026-09-21");
    expect(() => dateSchema.parse("2026-02-30")).toThrow();
    expect(() => dateSchema.parse("2026-9-21")).toThrow();
    expect(() => dateSchema.parse("2026-09-21T00:00:00Z")).toThrow();
  });
});

describe("caloriesSchema / proteinSchema", () => {
  it("accepts integers within bounds", () => {
    expect(caloriesSchema.parse(0)).toBe(0);
    expect(caloriesSchema.parse(5000)).toBe(5000);
    expect(proteinSchema.parse(500)).toBe(500);
  });

  it("rejects negatives, fractions and out-of-range", () => {
    expect(() => caloriesSchema.parse(-1)).toThrow();
    expect(() => caloriesSchema.parse(5001)).toThrow();
    expect(() => caloriesSchema.parse(12.5)).toThrow();
    expect(() => proteinSchema.parse(501)).toThrow();
  });
});

describe("weightSchema", () => {
  it("rounds to one decimal", () => {
    expect(weightSchema.parse(178.26)).toBe(178.3);
    expect(weightSchema.parse(178)).toBe(178);
  });

  it("accepts what a phone keypad produces", () => {
    expect(weightSchema.parse("178.")).toBe(178);
    expect(weightSchema.parse("178,2")).toBe(178.2);
    expect(weightSchema.parse(" 178.2 ")).toBe(178.2);
  });

  it("treats empty as null, never zero", () => {
    expect(weightSchema.parse("")).toBeNull();
    expect(weightSchema.parse(null)).toBeNull();
  });

  it("rejects nonsense and out-of-range", () => {
    expect(() => weightSchema.parse("abc")).toThrow();
    expect(() => weightSchema.parse(49.9)).toThrow();
    expect(() => weightSchema.parse(500.1)).toThrow();
  });
});

describe("notesSchema", () => {
  it("trims, and turns whitespace-only into null", () => {
    expect(notesSchema.parse("  legs heavy ")).toBe("legs heavy");
    expect(notesSchema.parse("   ")).toBeNull();
    expect(notesSchema.parse("")).toBeNull();
  });
});

describe("nameSchema", () => {
  it("requires 1–80 characters after trimming", () => {
    expect(nameSchema.parse(" Large egg ")).toBe("Large egg");
    expect(() => nameSchema.parse("  ")).toThrow();
    expect(() => nameSchema.parse("x".repeat(81))).toThrow();
  });
});

describe("quickAddSchema", () => {
  it("allows a nameless one-off", () => {
    expect(quickAddSchema.parse({ calories: 800, protein: 0, save: false })).toEqual({
      calories: 800,
      protein: 0,
      name: null,
      save: false,
    });
  });

  it("requires a name when saving to the list", () => {
    expect(() => quickAddSchema.parse({ calories: 800, protein: 0, save: true })).toThrow();
    expect(
      quickAddSchema.parse({ calories: 800, protein: 0, name: "Dinner", save: true }),
    ).toMatchObject({ name: "Dinner", save: true });
  });
});
