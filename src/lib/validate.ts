// Every server action validates through here. Bounds are from the spec:
// calories 0–5000, protein 0–500, weight 50–500 to one decimal, name ≤ 80.

import { z } from "zod";
import { isDateString } from "./dates";

export const dateSchema = z.string().refine(isDateString, "Not a calendar date");

export const caloriesSchema = z.number().int().min(0).max(5000);
export const proteinSchema = z.number().int().min(0).max(500);

// Accepts what a phone keypad produces: "178.", "178,2", "", or a number.
// Empty is null, never zero (rule R6).
export const weightSchema = z
  .union([z.number(), z.string(), z.null()])
  .transform((v, ctx) => {
    if (v === null) return null;
    if (typeof v === "string") {
      const s = v.trim().replace(",", ".");
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: "custom", message: "Not a number" });
        return z.NEVER;
      }
      v = n;
    }
    const rounded = Math.round(v * 10) / 10;
    if (rounded < 50 || rounded > 500) {
      ctx.addIssue({ code: "custom", message: "Weight must be 50–500 lb" });
      return z.NEVER;
    }
    return rounded;
  });

export const notesSchema = z
  .string()
  .max(2000)
  .transform((s) => {
    const t = s.trim();
    return t === "" ? null : t;
  });

export const nameSchema = z.string().trim().min(1).max(80);

export const entryNumbersSchema = z.object({
  calories: caloriesSchema,
  protein: proteinSchema,
});

export const quickAddSchema = z
  .object({
    calories: caloriesSchema,
    protein: proteinSchema,
    name: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((s) => (s ? s : null)),
    save: z.boolean(),
  })
  .refine((v) => !v.save || v.name !== null, {
    message: "A saved item needs a name",
    path: ["name"],
  });

export const itemInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: nameSchema,
  calories: caloriesSchema,
  protein: proteinSchema,
});

export type QuickAddInput = z.input<typeof quickAddSchema>;
export type ItemInput = z.input<typeof itemInputSchema>;
