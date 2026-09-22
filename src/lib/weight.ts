// The 7-day rolling average is the number (rule R4). The window is the last
// N calendar days ending on `date`, inclusive — missed days shrink the
// sample, they never widen the window.

import { addDays, type DateString } from "./dates";

export type WeightReading = { date: DateString; weight: number };

export function trailingAverage(
  readings: ReadonlyArray<WeightReading>,
  date: DateString,
  windowDays = 7,
): { average: number; count: number } | null {
  const from = addDays(date, -(windowDays - 1));
  const inWindow = readings.filter((r) => r.date >= from && r.date <= date);
  if (inWindow.length === 0) return null;
  const sum = inWindow.reduce((acc, r) => acc + r.weight, 0);
  return { average: sum / inWindow.length, count: inWindow.length };
}
