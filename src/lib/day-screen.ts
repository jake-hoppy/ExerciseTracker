// Everything the Today screen needs for one date, loaded in one pass. A date
// with no Day row renders exactly like an empty one (rule R1b).

import { addDays, today, type DateString } from "./dates";
import { db } from "./db";
import { orderItems, topItems } from "./items";
import { blocksCovering, targetsFor, workoutTypeIdFor } from "./schedule";
import { trailingAverage } from "./weight";

export type EntryView = { id: string; name: string | null; calories: number; protein: number };
export type ItemView = { id: string; name: string; calories: number; protein: number };

export type DayScreenData = {
  date: DateString;
  isToday: boolean;
  sessionName: string | null;
  isRest: boolean;
  blockName: string | null;
  targets: { calTarget: number | null; proteinTarget: number | null };
  day: { trained: boolean; weight: number | null; notes: string | null } | null;
  entries: EntryView[];
  weightAvg: { average: number; count: number } | null;
  items: ItemView[];
  topItems: ItemView[];
};

export function routeFor(date: DateString, current: DateString = today()): string {
  return date === current ? "/" : `/d/${date}`;
}

export async function loadDayScreen(date: DateString): Promise<DayScreenData> {
  const windowStart = addDays(date, -6);
  const [settings, types, blocks, day, weightDays, rawItems] = await Promise.all([
    db.settings.findUnique({ where: { id: "singleton" } }),
    db.workoutType.findMany(),
    db.block.findMany(),
    db.day.findUnique({
      where: { date },
      include: {
        entries: {
          orderBy: { loggedAt: "asc" },
          select: { id: true, name: true, calories: true, protein: true },
        },
      },
    }),
    db.day.findMany({
      where: { date: { gte: windowStart, lte: date }, weight: { not: null } },
      select: { date: true, weight: true },
    }),
    db.foodItem.findMany({ where: { archived: false } }),
  ]);

  const typeId = settings && workoutTypeIdFor(date, settings, day?.workoutTypeId ?? null);
  const session = typeId ? types.find((t) => t.id === typeId) : undefined;
  const items = orderItems(rawItems).map(({ id, name, calories, protein }) => ({
    id,
    name,
    calories,
    protein,
  }));

  return {
    date,
    isToday: date === today(),
    sessionName: session?.name ?? null,
    isRest: session?.isRest ?? false,
    blockName: blocksCovering(date, blocks)[0]?.name ?? null,
    targets: targetsFor(date, blocks, settings),
    day: day ? { trained: day.trained, weight: day.weight, notes: day.notes } : null,
    entries: day?.entries ?? [],
    weightAvg: trailingAverage(
      weightDays.map((d) => ({ date: d.date, weight: d.weight as number })),
      date,
    ),
    items,
    topItems: topItems(items),
  };
}
