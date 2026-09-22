// The Trends screen's read model: one StatRow per calendar date in the
// range, the rolling-average series, and the headline stats. Range is the
// block covering today, else the last 30 days through today.

import { addDays, eachDate, today, type DateString } from "./dates";
import { db } from "./db";
import { blocksCovering, targetsFor, workoutTypeIdFor } from "./schedule";
import {
  completion,
  currentStreak,
  longestStreak,
  mean,
  rollingAverageSeries,
  weightDelta,
  type AveragePoint,
  type Completion,
  type StatRow,
} from "./stats";
import { dayTotals } from "./totals";

export type TrendsData = {
  today: DateString;
  range: { start: DateString; end: DateString };
  block: { name: string; startWeight: number | null; goalWeight: number | null } | null;
  targets: { calTarget: number | null; proteinTarget: number | null };
  rows: StatRow[];
  series: AveragePoint[];
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
  const end = covering?.endDate && covering.endDate < now ? covering.endDate : now;

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
    const d = byDate.get(date);
    const typeId = settings && workoutTypeIdFor(date, settings, d?.workoutTypeId ?? null);
    const session = typeId ? typeById.get(typeId) : undefined;
    const totals = dayTotals(d?.entries ?? []);
    return {
      date,
      logged: (d?.entries.length ?? 0) > 0,
      calories: totals.calories,
      protein: totals.protein,
      weight: d?.weight ?? null,
      trained: d?.trained ?? false,
      isRest: session?.isRest ?? false,
    };
  };

  const rows = eachDate(start, end).map(toRow);
  const withLead = eachDate(addDays(start, -6), end).map(toRow);
  const series = rollingAverageSeries(withLead).filter((p) => p.date >= start);
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
