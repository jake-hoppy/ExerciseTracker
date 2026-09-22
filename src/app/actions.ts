"use server";

// Thin wrappers: validate, call src/lib/log, revalidate the day. The date is
// always passed so the right route re-renders. Invalid input throws; the
// client shows an inline retry (spec: Errors).

import { revalidatePath } from "next/cache";
import { routeFor } from "@/lib/routes";
import * as log from "@/lib/log";
import {
  dateSchema,
  entryNumbersSchema,
  itemInputSchema,
  notesSchema,
  quickAddSchema,
  weightSchema,
} from "@/lib/validate";

function revalidateDay(date: string) {
  revalidatePath(routeFor(date));
  revalidatePath("/");
  revalidatePath("/block");
}

export async function logItemAction(date: string, itemId: string): Promise<void> {
  const d = dateSchema.parse(date);
  await log.logItem(d, itemId);
  revalidateDay(d);
}

export async function quickAddAction(
  date: string,
  input: { calories: number; protein: number; name?: string; save: boolean },
): Promise<void> {
  const d = dateSchema.parse(date);
  await log.quickAdd(d, quickAddSchema.parse(input));
  revalidateDay(d);
}

export async function updateEntryAction(
  date: string,
  entryId: string,
  input: { calories: number; protein: number },
): Promise<void> {
  const d = dateSchema.parse(date);
  await log.updateEntry(entryId, entryNumbersSchema.parse(input));
  revalidateDay(d);
}

export async function removeEntryAction(date: string, entryId: string): Promise<void> {
  const d = dateSchema.parse(date);
  await log.removeEntry(entryId);
  revalidateDay(d);
}

export async function setWeightAction(
  date: string,
  raw: string | number | null,
): Promise<number | null> {
  const d = dateSchema.parse(date);
  const lbs = weightSchema.parse(raw);
  await log.setWeight(d, lbs);
  revalidateDay(d);
  return lbs;
}

export async function setTrainedAction(date: string, trained: boolean): Promise<void> {
  const d = dateSchema.parse(date);
  await log.setTrained(d, trained);
  revalidateDay(d);
}

export async function saveNotesAction(date: string, text: string): Promise<void> {
  const d = dateSchema.parse(date);
  await log.saveNotes(d, notesSchema.parse(text));
  revalidateDay(d);
}

export async function upsertItemAction(
  date: string,
  input: { id?: string; name: string; calories: number; protein: number },
): Promise<{ id: string }> {
  const d = dateSchema.parse(date);
  const item = await log.upsertItem(itemInputSchema.parse(input));
  revalidateDay(d);
  return item;
}

export async function archiveItemAction(date: string, id: string): Promise<void> {
  const d = dateSchema.parse(date);
  await log.archiveItem(id);
  revalidateDay(d);
}
