// Runs against the database in .env.local. Uses dates in January 2000 and
// cleans up everything it creates. Skipped when DATABASE_URL is unset.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  archiveItem,
  logItem,
  quickAdd,
  removeEntry,
  saveNotes,
  setTrained,
  setWeight,
  updateEntry,
  upsertItem,
} from "./log";

const D1 = "2000-01-01";
const D2 = "2000-01-02";
const TEST_ITEM = "__test__ Konala bowl";

describe.skipIf(!process.env.DATABASE_URL)("log", () => {
  let itemId: string;

  beforeAll(async () => {
    await cleanup();
    const item = await db.foodItem.create({
      data: { name: TEST_ITEM, calories: 751, protein: 54 },
    });
    itemId = item.id;
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  async function cleanup() {
    await db.day.deleteMany({ where: { date: { in: [D1, D2] } } }); // cascades entries
    await db.foodItem.deleteMany({ where: { name: { startsWith: "__test__" } } });
  }

  it("logItem creates the Day on first write and copies the item's numbers and name", async () => {
    expect(await db.day.findUnique({ where: { date: D1 } })).toBeNull();
    const { id } = await logItem(D1, itemId);
    const entry = await db.entry.findUniqueOrThrow({ where: { id }, include: { day: true } });
    expect(entry.day.date).toBe(D1);
    expect(entry).toMatchObject({ name: TEST_ITEM, calories: 751, protein: 54, itemId });
  });

  it("logItem bumps timesUsed and lastUsed", async () => {
    const before = await db.foodItem.findUniqueOrThrow({ where: { id: itemId } });
    await logItem(D1, itemId);
    const after = await db.foodItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(after.timesUsed).toBe(before.timesUsed + 1);
    expect(after.lastUsed).not.toBeNull();
  });

  it("logItem works on a past date with no Day (R1c), the same as any other", async () => {
    await logItem(D2, itemId);
    const day = await db.day.findUniqueOrThrow({ where: { date: D2 }, include: { entries: true } });
    expect(day.entries).toHaveLength(1);
  });

  it("quickAdd without save makes a nameless entry with no item", async () => {
    const { id } = await quickAdd(D1, { calories: 800, protein: 0, name: null, save: false });
    const entry = await db.entry.findUniqueOrThrow({ where: { id } });
    expect(entry).toMatchObject({ name: null, itemId: null, calories: 800, protein: 0 });
  });

  it("quickAdd with save creates the item, links it, and counts the use", async () => {
    const { id } = await quickAdd(D1, {
      calories: 320,
      protein: 20,
      name: "__test__ Dinner",
      save: true,
    });
    const entry = await db.entry.findUniqueOrThrow({ where: { id }, include: { item: true } });
    expect(entry.item).toMatchObject({ name: "__test__ Dinner", calories: 320, protein: 20, timesUsed: 1 });
    expect(entry.name).toBe("__test__ Dinner");
  });

  it("updateEntry changes that entry only, never the item", async () => {
    const { id } = await logItem(D1, itemId);
    await updateEntry(id, { calories: 700, protein: 50 });
    const entry = await db.entry.findUniqueOrThrow({ where: { id } });
    const item = await db.foodItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(entry).toMatchObject({ calories: 700, protein: 50 });
    expect(item).toMatchObject({ calories: 751, protein: 54 });
  });

  it("removeEntry deletes the entry and keeps the Day", async () => {
    const { id } = await logItem(D2, itemId);
    await removeEntry(id);
    expect(await db.entry.findUnique({ where: { id } })).toBeNull();
    expect(await db.day.findUnique({ where: { date: D2 } })).not.toBeNull();
  });

  it("setWeight / setTrained / saveNotes write Day fields, creating the Day if needed", async () => {
    await db.day.deleteMany({ where: { date: D2 } });
    await setWeight(D2, 178.2);
    await setTrained(D2, true);
    await saveNotes(D2, "legs heavy");
    expect(await db.day.findUniqueOrThrow({ where: { date: D2 } })).toMatchObject({
      weight: 178.2,
      trained: true,
      notes: "legs heavy",
    });
    await setWeight(D2, null);
    await saveNotes(D2, null);
    expect(await db.day.findUniqueOrThrow({ where: { date: D2 } })).toMatchObject({
      weight: null,
      notes: null,
    });
  });

  it("upsertItem edits the item without touching its entries", async () => {
    const { id: entryId } = await logItem(D1, itemId);
    await upsertItem({ id: itemId, name: "__test__ Konala bowl (fixed)", calories: 760, protein: 55 });
    const item = await db.foodItem.findUniqueOrThrow({ where: { id: itemId } });
    const entry = await db.entry.findUniqueOrThrow({ where: { id: entryId } });
    expect(item).toMatchObject({ name: "__test__ Konala bowl (fixed)", calories: 760 });
    expect(entry).toMatchObject({ name: TEST_ITEM, calories: 751 });
  });

  it("upsertItem without an id creates a new item", async () => {
    const { id } = await upsertItem({ name: "__test__ New", calories: 100, protein: 10 });
    expect(await db.foodItem.findUnique({ where: { id } })).toMatchObject({ timesUsed: 0 });
  });

  it("archiveItem hides the item; entries logged from it keep their name", async () => {
    const { id: entryId } = await logItem(D1, itemId);
    await archiveItem(itemId);
    expect((await db.foodItem.findUniqueOrThrow({ where: { id: itemId } })).archived).toBe(true);
    expect((await db.entry.findUniqueOrThrow({ where: { id: entryId } })).name).not.toBeNull();
  });
});
