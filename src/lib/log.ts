// Every write in the app. Day-scoped writes go through ensureDay so the row
// exists the first time anything is logged on a date (rule R1b), today or
// any other day (rule R1c). Entries copy the item's numbers and name so a
// later item edit never rewrites history (docs/07-food-log.md).

import type { DateString } from "./dates";
import { ensureDay } from "./days";
import { db } from "./db";

export async function logItem(date: DateString, itemId: string): Promise<{ id: string }> {
  const [day, item] = await Promise.all([
    ensureDay(date),
    db.foodItem.findUniqueOrThrow({ where: { id: itemId } }),
  ]);
  const [entry] = await db.$transaction([
    db.entry.create({
      data: {
        dayId: day.id,
        itemId,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
      },
      select: { id: true },
    }),
    db.foodItem.update({
      where: { id: itemId },
      data: { timesUsed: { increment: 1 }, lastUsed: new Date() },
    }),
  ]);
  return entry;
}

export async function quickAdd(
  date: DateString,
  input: { calories: number; protein: number; name: string | null; save: boolean },
): Promise<{ id: string }> {
  const day = await ensureDay(date);
  if (input.save) {
    if (!input.name) throw new Error("A saved item needs a name");
    const item = await db.foodItem.create({
      data: {
        name: input.name,
        calories: input.calories,
        protein: input.protein,
        timesUsed: 1,
        lastUsed: new Date(),
      },
    });
    return db.entry.create({
      data: {
        dayId: day.id,
        itemId: item.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
      },
      select: { id: true },
    });
  }
  return db.entry.create({
    data: {
      dayId: day.id,
      name: input.name,
      calories: input.calories,
      protein: input.protein,
    },
    select: { id: true },
  });
}

export async function updateEntry(
  entryId: string,
  input: { calories: number; protein: number },
): Promise<void> {
  await db.entry.update({ where: { id: entryId }, data: input });
}

export async function removeEntry(entryId: string): Promise<void> {
  await db.entry.delete({ where: { id: entryId } });
}

export async function setWeight(date: DateString, lbs: number | null): Promise<void> {
  const day = await ensureDay(date);
  await db.day.update({ where: { id: day.id }, data: { weight: lbs } });
}

export async function setTrained(date: DateString, trained: boolean): Promise<void> {
  const day = await ensureDay(date);
  await db.day.update({ where: { id: day.id }, data: { trained } });
}

export async function saveNotes(date: DateString, notes: string | null): Promise<void> {
  const day = await ensureDay(date);
  await db.day.update({ where: { id: day.id }, data: { notes } });
}

export async function upsertItem(input: {
  id?: string;
  name: string;
  calories: number;
  protein: number;
}): Promise<{ id: string }> {
  const data = { name: input.name, calories: input.calories, protein: input.protein };
  if (input.id) {
    return db.foodItem.update({ where: { id: input.id }, data, select: { id: true } });
  }
  return db.foodItem.create({ data, select: { id: true } });
}

export async function archiveItem(id: string): Promise<void> {
  await db.foodItem.update({ where: { id }, data: { archived: true } });
}
