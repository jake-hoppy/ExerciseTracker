// The one place user-visible numbers and dates are formatted. Empty renders
// as an em dash, never as 0.

import { weekdayIndex, type DateString } from "./dates";

export const EMPTY = "—";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Pounds, one decimal: 178.2 */
export function formatWeight(lbs: number | null | undefined): string {
  return lbs == null ? EMPTY : lbs.toFixed(1);
}

/** kcal, grouped: 2,100 */
export function formatKcal(kcal: number | null | undefined): string {
  return kcal == null ? EMPTY : intFmt.format(kcal);
}

/** Grams, whole: 150 */
export function formatGrams(g: number | null | undefined): string {
  return g == null ? EMPTY : intFmt.format(g);
}

/** "Aug 13" */
export function formatShortDate(date: DateString): string {
  const [, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Thu" */
export function formatWeekday(date: DateString): string {
  return WEEKDAYS[weekdayIndex(date)];
}

/** "Aug 13 – Sep 11, 2026", or with both years when they differ. */
export function formatDateRange(start: DateString, end: DateString): string {
  const sy = start.slice(0, 4);
  const ey = end.slice(0, 4);
  return sy === ey
    ? `${formatShortDate(start)} – ${formatShortDate(end)}, ${ey}`
    : `${formatShortDate(start)}, ${sy} – ${formatShortDate(end)}, ${ey}`;
}

/** "7-day", or "4-day" when the window is short (rule R4). */
export function formatAvgLabel(count: number): string {
  return `${count}-day`;
}
