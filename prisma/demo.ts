// Demo data for looking at the charts before there's a month of real use.
//
//   npm run seed:demo    fill empty days in the last 28 with plausible data
//   npm run seed:clear   remove exactly what seed:demo added
//
// Separation from real data: demo only touches days that are completely
// empty (no entries, no weight, no notes, not trained), writes what it did
// to .demo/manifest.json (gitignored), sets each demo day's notes to a
// visible marker, and links no FoodItem so usage counts stay real.
// seed:clear reverses the manifest and nothing else.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { addDays, eachDate, today } from "../src/lib/dates";
import { workoutTypeIdFor } from "../src/lib/schedule";

config({ path: ".env.local" });

const MANIFEST = ".demo/manifest.json";
export const DEMO_NOTE = "Demo data — npm run seed:clear";
const DAYS_BACK = 28;

type Manifest = {
  createdAt: string;
  days: { date: string; createdRow: boolean }[];
};

// Plausible meals, copied by value like real entries (no itemId).
const MEALS: [name: string, calories: number, protein: number][] = [
  ["Jimmy Dean sausage, 1/4 roll", 323, 14],
  ["Large egg", 72, 6],
  ["Large egg", 72, 6],
  ["Thomas' English muffin", 150, 5],
  ["Konala chicken burrito bowl", 751, 54],
  ["Core Power Elite chocolate", 240, 42],
  ["Chick-fil-A grilled nuggets, 12 ct", 200, 38],
  ["Fairlife chocolate milk", 150, 30],
  ["Konala southwest chicken bowl", 601, 46],
  ["In-N-Out 3x3", 800, 50],
];

// Deterministic pseudo-randomness so the demo looks the same every run.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function isEmpty(d: { trained: boolean; weight: number | null; notes: string | null; entries: unknown[] }) {
  return !d.trained && d.weight === null && d.notes === null && d.entries.length === 0;
}

async function demo(db: PrismaClient) {
  if (existsSync(MANIFEST)) {
    throw new Error(`${MANIFEST} exists — run seed:clear first`);
  }
  const end = addDays(today(), -1); // never touch today
  const dates = eachDate(addDays(end, -(DAYS_BACK - 1)), end);
  const existing = await db.day.findMany({
    where: { date: { in: dates } },
    include: { entries: { select: { id: true } } },
  });
  const byDate = new Map(existing.map((d) => [d.date, d]));
  const manifest: Manifest = { createdAt: new Date().toISOString(), days: [] };
  const rand = rng(20260921);
  // Rest days come from the real schedule so "trained" lines up with it.
  const [settings, types] = await Promise.all([
    db.settings.findUnique({ where: { id: "singleton" } }),
    db.workoutType.findMany(),
  ]);
  const isRest = (date: string) => {
    const id = settings && workoutTypeIdFor(date, settings, null);
    return types.find((t) => t.id === id)?.isRest ?? false;
  };

  for (const [i, date] of dates.entries()) {
    const found = byDate.get(date);
    if (found && !isEmpty(found)) continue; // real data: leave it alone
    // A cut: about a pound a week off a trend line, with independent daily
    // water-weight noise (not a random walk); one day in nine unlogged.
    const weight = Math.round((181.4 - i * 0.14 + (rand() - 0.5) * 1.8) * 10) / 10;
    const trained = !isRest(date) && rand() < 0.85;
    const skipFood = rand() < 0.11;
    const skipWeight = rand() < 0.08;
    const mealCount = 3 + Math.floor(rand() * 3);
    const picks = Array.from({ length: mealCount }, () => MEALS[Math.floor(rand() * MEALS.length)]);

    const day = found
      ? await db.day.update({
          where: { id: found.id },
          data: { weight: skipWeight ? null : weight, trained, notes: DEMO_NOTE },
        })
      : await db.day.create({
          data: { date, weight: skipWeight ? null : weight, trained, notes: DEMO_NOTE },
        });
    if (!skipFood) {
      await db.entry.createMany({
        data: picks.map(([name, calories, protein]) => ({ dayId: day.id, name, calories, protein })),
      });
    }
    manifest.days.push({ date, createdRow: !found });
  }

  mkdirSync(".demo", { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`Demo: filled ${manifest.days.length} of ${dates.length} days (${dates[0]}..${end}). Manifest at ${MANIFEST}.`);
}

async function clear(db: PrismaClient) {
  if (!existsSync(MANIFEST)) {
    console.log("No demo manifest — nothing to clear.");
    return;
  }
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  let removed = 0;
  for (const { date, createdRow } of manifest.days) {
    const day = await db.day.findUnique({ where: { date } });
    if (!day) continue;
    if (createdRow) {
      await db.day.delete({ where: { id: day.id } }); // cascades entries
    } else {
      await db.entry.deleteMany({ where: { dayId: day.id } });
      await db.day.update({ where: { id: day.id }, data: { weight: null, trained: false, notes: null } });
    }
    removed += 1;
  }
  rmSync(MANIFEST);
  console.log(`Demo: cleared ${removed} days.`);
}

async function main() {
  const mode = process.argv[2];
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  try {
    if (mode === "demo") await demo(db);
    else if (mode === "clear") await clear(db);
    else throw new Error("Usage: tsx prisma/demo.ts demo|clear");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
