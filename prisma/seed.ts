// Seeds Settings, the completed block's days from data/seed-block.json, and
// the saved food items from docs/07-food-log.md. Safe to re-run: every write
// is keyed on something stable, and Settings and food items are create-only
// so a re-run never undoes an edit or moves the cycle's anchor.
//
// The prototype's workoutDone/foodLogged/proteinHit/waist fields are dropped
// (D4, rule R1). workoutDone becomes `trained`. Logged calories/protein, if an
// export ever fills them, become one untitled Entry per day (rule R6c).

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { eachDate, isDateString, today } from "../src/lib/dates";

config({ path: ".env.local" });

type SeedDay = {
  date: string;
  workout: string;
  rest: boolean;
  workoutDone: boolean;
  calories: number | null;
  proteinGrams: number | null;
  weight: number | null;
  notes: string;
};

type SeedBlock = {
  plan: string;
  window: { start: string; end: string };
  targets: {
    startWeight: number | null;
    goalWeight: number | null;
    calTarget: number;
    proteinTarget: number;
  };
  days: SeedDay[];
};

// The standing 4-day rotation, anchored on the day Settings is created (D4).
// Historical days keep their logged session as a per-day override, because
// the Aug–Sep block swapped in Pull + Legs and doesn't follow the cycle.
const CYCLE = ["Push + Run", "Pull + Run", "Legs", "Rest"];

// docs/07-food-log.md, "Seed list".
const FOOD_ITEMS: Array<[name: string, calories: number, protein: number]> = [
  ["Konala chicken burrito bowl", 751, 54],
  ["Konala southwest chicken bowl", 601, 46],
  ["Konala dry rub chicken (add-on)", 357, 39],
  ["Core Power Elite chocolate", 240, 42],
  ["Fairlife chocolate milk", 150, 30],
  ["Chick-fil-A spicy chicken sandwich", 450, 28],
  ["Chick-fil-A grilled nuggets, 12 ct", 200, 38],
  ["In-N-Out 3x3", 800, 50],
  ["In-N-Out fries", 370, 5],
  ["Taco Bell cantina chicken bowl", 520, 25],
  ["Jimmy Dean sausage, 1/4 roll", 323, 14],
  ["Large egg", 72, 6],
  ["Thomas' English muffin", 150, 5],
  ["Cheddar slice", 90, 5],
];

function validate(seed: SeedBlock) {
  const { start, end } = seed.window;
  const expected = eachDate(start, end);
  const actual = seed.days.map((d) => d.date);
  for (const d of actual) {
    if (!isDateString(d)) throw new Error(`Bad date in seed: ${d}`);
  }
  if (actual.join() !== expected.join()) {
    throw new Error(`Seed days don't cover ${start}..${end} exactly once, in order`);
  }
  for (const d of seed.days) {
    if ((d.calories == null) !== (d.proteinGrams == null)) {
      throw new Error(`${d.date}: calories and protein must both be logged or both be empty`);
    }
  }
}

async function main() {
  const seed: SeedBlock = JSON.parse(readFileSync("data/seed-block.json", "utf8"));
  validate(seed);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

  try {
    const typeNames = new Map<string, boolean>();
    for (const name of CYCLE) typeNames.set(name, name === "Rest");
    for (const d of seed.days) typeNames.set(d.workout, d.rest);

    const typeIds = new Map<string, string>();
    for (const [name, isRest] of typeNames) {
      const t = await db.workoutType.upsert({
        where: { name },
        update: { isRest },
        create: { name, isRest },
      });
      typeIds.set(name, t.id);
    }

    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: {
        scheduleMode: "cycle",
        pattern: CYCLE.map((name) => typeIds.get(name)!),
        anchorDate: today(),
        calTarget: seed.targets.calTarget,
        proteinTarget: seed.targets.proteinTarget,
      },
    });

    // The finished block, as a label over its dates. Days don't reference it.
    const blockData = {
      name: seed.plan,
      startDate: seed.window.start,
      endDate: seed.window.end,
      startWeight: seed.targets.startWeight,
      goalWeight: seed.targets.goalWeight,
      calTarget: seed.targets.calTarget,
      proteinTarget: seed.targets.proteinTarget,
    };
    const existing = await db.block.findFirst({
      where: { name: seed.plan, startDate: seed.window.start },
    });
    if (existing) await db.block.update({ where: { id: existing.id }, data: blockData });
    else await db.block.create({ data: blockData });

    for (const d of seed.days) {
      const data = {
        workoutTypeId: typeIds.get(d.workout)!,
        trained: d.workoutDone,
        weight: d.weight,
        notes: d.notes.trim() === "" ? null : d.notes,
      };
      const day = await db.day.upsert({
        where: { date: d.date },
        update: data,
        create: { ...data, date: d.date },
      });

      if (d.calories != null && d.proteinGrams != null) {
        const hasEntries = await db.entry.count({ where: { dayId: day.id } });
        if (hasEntries === 0) {
          await db.entry.create({
            data: { dayId: day.id, calories: d.calories, protein: d.proteinGrams },
          });
        }
      }
    }

    for (const [name, calories, protein] of FOOD_ITEMS) {
      const found = await db.foodItem.findFirst({ where: { name } });
      if (!found) await db.foodItem.create({ data: { name, calories, protein } });
    }

    console.log(
      `Seeded settings (cycle from ${settings.anchorDate}), ${typeIds.size} workout types, ` +
        `${seed.days.length} days of "${seed.plan}", ${await db.foodItem.count()} food items.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
