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
