// Day totals derive from entries, computed on read (rule R6c). A day with no
// entries has null totals, not zero (rule R6).

export type Totals = { calories: number | null; protein: number | null };

export function dayTotals(
  entries: ReadonlyArray<{ calories: number; protein: number }>,
): Totals {
  if (entries.length === 0) return { calories: null, protein: null };
  let calories = 0;
  let protein = 0;
  for (const e of entries) {
    calories += e.calories;
    protein += e.protein;
  }
  return { calories, protein };
}

export type Remaining =
  | { kind: "left"; amount: number }
  | { kind: "over"; amount: number }
  | { kind: "none" };

/** What's left against a target. No target means nothing to say (rule R6b). */
export function remaining(total: number | null, target: number | null): Remaining {
  if (target == null) return { kind: "none" };
  const diff = target - (total ?? 0);
  return diff >= 0 ? { kind: "left", amount: diff } : { kind: "over", amount: -diff };
}
