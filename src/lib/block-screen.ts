// The block view: every date from the first logged day through today,
// grouped by month, newest first. Unlogged days are rows too (rule R1c).

import { spanRows, today, type DateString } from "./dates";
import { db } from "./db";
import { groupByMonth } from "./months";
import { blocksCovering, workoutTypeIdFor } from "./schedule";
import { dayTotals, type Totals } from "./totals";

export type BlockRow = {
  date: DateString;
  sessionName: string | null;
  isRest: boolean;
  trained: boolean;
  weight: number | null;
  totals: Totals;
  logged: boolean;
  blockName: string | null;
};

export async function loadBlockScreen(): Promise<{ label: string; rows: BlockRow[] }[]> {
  const [settings, types, blocks, days] = await Promise.all([
    db.settings.findUnique({ where: { id: "singleton" } }),
    db.workoutType.findMany(),
    db.block.findMany(),
    db.day.findMany({
      select: {
        date: true,
        workoutTypeId: true,
        trained: true,
        weight: true,
        entries: { select: { calories: true, protein: true } },
      },
    }),
  ]);
  const typeById = new Map(types.map((t) => [t.id, t]));
  const session = (date: DateString, override: string | null) => {
    const id = settings && workoutTypeIdFor(date, settings, override);
    return id ? typeById.get(id) : undefined;
  };
  const row = (
    date: DateString,
    d: { workoutTypeId: string | null; trained: boolean; weight: number | null; entries: Totals[] } | null,
  ): BlockRow => {
    const s = session(date, d?.workoutTypeId ?? null);
    return {
      date,
      sessionName: s?.name ?? null,
      isRest: s?.isRest ?? false,
      trained: d?.trained ?? false,
      weight: d?.weight ?? null,
      totals: dayTotals((d?.entries ?? []) as { calories: number; protein: number }[]),
      logged: (d?.entries.length ?? 0) > 0,
      blockName: blocksCovering(date, blocks)[0]?.name ?? null,
    };
  };
  const real = days.map((d) => row(d.date, d as Parameters<typeof row>[1]));
  return groupByMonth(spanRows(real, today(), (date) => row(date, null)));
}
