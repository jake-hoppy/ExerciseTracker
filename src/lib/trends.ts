// The Trends screen's read model: one StatRow per calendar date in the
// range, the rolling-average series, and the headline stats. Range is the
// block covering today, else the last 30 days through today.

import { addDays, eachDate, today, type DateString } from "./dates";
import { db } from "./db";
import { blocksCovering, targetsFor, workoutTypeIdFor } from "./schedule";
import {
  anchorAtStart,
  completion,
  currentStreak,
  longestStreak,
  mean,
  rollingAverageSeries,
  statRowFrom,
  weightDelta,
  type AveragePoint,
  type Completion,
  type StatRow,
} from "./stats";

export type TrendsData = {
  today: DateString;
  range: { start: DateString; end: DateString };
  block: { name: string; startWeight: number | null; goalWeight: number | null } | null;
  targets: { calTarget: number | null; proteinTarget: number | null };
  rows: StatRow[];
  series: AveragePoint[];
  // Day 1 carries the block's startWeight because it had no reading (R4).
  anchored: boolean;
  stats: {
    currentStreak: number;
    longestStreak: number;
    completion: Completion;
    delta: { delta: number; window: number } | null;
    avgCalories: number | null;
    avgProtein: number | null;
  };
};

export async function loadTrends(): Promise<TrendsData> {
  const now = today();
  const [settings, types, blocks] = await Promise.all([
    db.settings.findUnique({ where: { id: "singleton" } }),
    db.workoutType.findMany(),
    db.block.findMany(),
  ]);
  const covering = blocksCovering(now, blocks)[0] ?? null;
  const start = covering ? covering.startDate : addDays(now, -29);
  const end = now; // a covering block by definition includes today

  // The average needs the week before the range too (rule R4).
  const days = await db.day.findMany({
    where: { date: { gte: addDays(start, -6), lte: end } },
    select: {
      date: true,
      workoutTypeId: true,
      trained: true,
      weight: true,
      entries: { select: { calories: true, protein: true } },
    },
  });
  const byDate = new Map(days.map((d) => [d.date, d]));
  const typeById = new Map(types.map((t) => [t.id, t]));

  const toRow = (date: DateString): StatRow => {
    const d = byDate.get(date) ?? null;
    const typeId = settings && workoutTypeIdFor(date, settings, d?.workoutTypeId ?? null);
    return statRowFrom(date, d, typeId ? (typeById.get(typeId)?.isRest ?? false) : false);
  };

  const lead = eachDate(addDays(start, -6), addDays(start, -1)).map(toRow);
  const { rows, anchored } = anchorAtStart(eachDate(start, end).map(toRow), covering?.startWeight ?? null);
  // The anchor is day 1's origin, so the average must not look further back.
  const series = rollingAverageSeries(anchored ? rows : [...lead, ...rows]).filter((p) => p.date >= start);
  const targets = targetsFor(now, blocks, settings);
  const loggedRows = rows.filter((r) => r.logged);

  return {
    today: now,
    range: { start, end },
    block: covering
      ? { name: covering.name, startWeight: covering.startWeight, goalWeight: covering.goalWeight }
      : null,
    targets,
    rows,
    series,
    anchored,
    stats: {
      currentStreak: currentStreak(rows, now),
      longestStreak: longestStreak(rows),
      completion: completion(rows),
      delta: weightDelta(series, covering?.startWeight ?? null),
      avgCalories: mean(loggedRows.map((r) => r.calories)),
      avgProtein: mean(loggedRows.map((r) => r.protein)),
    },
  };
}
