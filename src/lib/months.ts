// Groups the block view's rows by calendar month, newest first (rule R7:
// dates are strings, so the month is the first seven characters).

import type { DateString } from "./dates";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "September 2026" */
export function monthLabel(date: DateString): string {
  const [y, m] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function groupByMonth<T extends { date: DateString }>(
  rows: readonly T[],
): { label: string; rows: T[] }[] {
  const byMonth = new Map<string, T[]>();
  for (const r of [...rows].sort((a, b) => (a.date < b.date ? 1 : -1))) {
    const key = r.date.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), r]);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, rows]) => ({ label: monthLabel(`${key}-01`), rows }));
}
