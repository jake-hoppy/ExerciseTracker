// What a date's session and targets are, for any date forever (rule R1b).
// Nothing is pre-generated: the workout is computed from Settings, and a
// Block only ever matters if its range happens to cover the date (D4).

import { daysBetween, weekdayIndex, type DateString } from "./dates";

export type Schedule = {
  scheduleMode: string; // "weekly" | "cycle"
  pattern: unknown; // Json column: an array of workout type ids
  anchorDate: DateString;
};

/**
 * The workout type id for `date`. A per-day override wins; otherwise
 * cycle mode indexes from the anchor, weekly mode by weekday (0 = Sunday).
 */
export function workoutTypeIdFor(
  date: DateString,
  schedule: Schedule,
  override: string | null = null,
): string {
  if (override) return override;
  const pattern = schedule.pattern;
  if (!Array.isArray(pattern) || pattern.length === 0) {
    throw new Error("Settings.pattern must be a non-empty array");
  }
  let index: number;
  if (schedule.scheduleMode === "cycle") {
    const n = pattern.length;
    // Dates before the anchor still resolve: ((x % n) + n) % n is never negative.
    index = ((daysBetween(schedule.anchorDate, date) % n) + n) % n;
  } else if (schedule.scheduleMode === "weekly") {
    if (pattern.length !== 7) throw new Error("Weekly pattern needs 7 entries");
    index = weekdayIndex(date);
  } else {
    throw new Error(`Unknown scheduleMode: ${schedule.scheduleMode}`);
  }
  return String(pattern[index]);
}

type TargetSource = { calTarget: number | null; proteinTarget: number | null };
type BlockRange = TargetSource & { startDate: DateString; endDate: DateString | null };

/** Blocks whose range covers `date`, latest-starting first. */
export function blocksCovering<B extends { startDate: DateString; endDate: DateString | null }>(
  date: DateString,
  blocks: ReadonlyArray<B>,
): B[] {
  return blocks
    .filter((b) => b.startDate <= date && (b.endDate == null || date <= b.endDate))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

/**
 * Targets for `date` (rule R6b): the latest-starting Block covering it that
 * sets a target, else the Settings default, else null. Resolved per field.
 */
export function targetsFor(
  date: DateString,
  blocks: ReadonlyArray<BlockRange>,
  settings: TargetSource | null,
): TargetSource {
  const covering = blocksCovering(date, blocks);
  const pick = (field: keyof TargetSource) =>
    covering.find((b) => b[field] != null)?.[field] ?? settings?.[field] ?? null;
  return { calTarget: pick("calTarget"), proteinTarget: pick("proteinTarget") };
}
