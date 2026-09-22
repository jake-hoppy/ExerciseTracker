// The stats module. Every function here implements a rule in
// docs/04-domain-rules.md and has a hand-checked test. Rows are one per
// calendar date; a date with no row is unlogged (rule R1c).

import { addDays, type DateString } from "./dates";
import { trailingAverage } from "./weight";

export type StatRow = {
  date: DateString;
  logged: boolean; // at least one food entry (rule R1)
  calories: number | null;
  protein: number | null;
  weight: number | null;
  trained: boolean;
  isRest: boolean;
};

export type AveragePoint = { date: DateString; average: number | null; count: number };

/**
 * Rule R2: consecutive logged days ending today. If today isn't logged
 * yet it is skipped, not counted against — today can only ever add.
 */
export function currentStreak(rows: readonly StatRow[], today: DateString): number {
  const logged = new Set(rows.filter((r) => r.logged).map((r) => r.date));
  let d = logged.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (logged.has(d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

/** Rule R3: the longest run of consecutive logged dates anywhere in the range. */
export function longestStreak(rows: readonly StatRow[]): number {
  const dates = rows
    .filter((r) => r.logged)
    .map((r) => r.date)
    .sort();
  let best = 0;
  let run = 0;
  let prev: DateString | null = null;
  for (const d of dates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Rule R6: nulls are excluded entirely; a real zero counts. */
export function mean(values: ReadonlyArray<number | null>): number | null {
  const real = values.filter((v): v is number => v !== null);
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

/** Rule R4: each date's trailing calendar-window average of the raw readings. */
export function rollingAverageSeries(rows: readonly StatRow[], windowDays = 7): AveragePoint[] {
  const readings = rows
    .filter((r): r is StatRow & { weight: number } => r.weight !== null)
    .map((r) => ({ date: r.date, weight: r.weight }));
  return rows.map((r) => {
    const avg = trailingAverage(readings, r.date, windowDays);
    return avg
      ? { date: r.date, average: avg.average, count: avg.count }
      : { date: r.date, average: null, count: 0 };
  });
}

export type Completion = {
  totalDays: number;
  trainingDays: number;
  restDays: number;
  loggedDays: number;
  trainedDays: number;
};

/** Rule R5: every count comes from the rows' own sessions. */
export function completion(rows: readonly StatRow[]): Completion {
  let trainingDays = 0;
  let restDays = 0;
  let loggedDays = 0;
  let trainedDays = 0;
  for (const r of rows) {
    if (r.isRest) restDays += 1;
    else trainingDays += 1;
    if (r.logged) loggedDays += 1;
    if (r.trained) trainedDays += 1;
  }
  return { totalDays: rows.length, trainingDays, restDays, loggedDays, trainedDays };
}

/**
 * Rule R4: the headline delta is average-to-average, from the first point
 * with an average to the last, and states the last point's window. When
 * the first date has no average, `startWeight` anchors the series; a real
 * first-day average supersedes it.
 */
export function weightDelta(
  series: readonly AveragePoint[],
  startWeight: number | null,
): { delta: number; window: number } | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  if (last.average === null) return null;
  const first = series[0];
  // Origin: the first day's average; else the block's start weight as an
  // anchor; else (no block) the first day that has an average.
  const firstWithAvg = series.findIndex((p) => p.average !== null);
  const origin = first.average ?? startWeight ?? series[firstWithAvg].average;
  if (origin === null) return null;
  // The origin must be a different point than the last, or there is no change to report.
  const originIsLast = first.average === null && startWeight === null && firstWithAvg === series.length - 1;
  if (originIsLast || (series.length === 1 && first.average !== null)) return null;
  return { delta: Math.round((last.average - origin) * 10) / 10, window: last.count };
}
