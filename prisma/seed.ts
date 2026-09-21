// Seeds the completed block from data/seed-block.json. Safe to re-run: every
// write is an upsert keyed on something stable.
//
// The prototype's workoutDone/foodLogged/proteinHit/waist fields are dropped
// (D4, rule R1). workoutDone becomes `trained`. Logged calories/protein, if an
// export ever fills them, become one untitled Entry per day (rule R6c).

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { eachDate, isDateString } from "../src/lib/dates";

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

// The Aug–Sep block ran a 4-day rotation (D4b). The seeded days are copied
// as logged, not regenerated, because some weeks swapped in Pull + Legs.
const CYCLE = ["Push + Run", "Pull + Run", "Legs", "Rest"];

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

    const blockData = {
      name: seed.plan,
      startDate: seed.window.start,
      endDate: seed.window.end,
      scheduleMode: "cycle",
      pattern: CYCLE.map((name) => {
        const id = typeIds.get(name);
        if (!id) throw new Error(`Cycle names unknown workout type: ${name}`);
        return id;
      }),
      startWeight: seed.targets.startWeight,
      goalWeight: seed.targets.goalWeight,
      calTarget: seed.targets.calTarget,
      proteinTarget: seed.targets.proteinTarget,
    };

    const existing = await db.block.findFirst({
      where: { name: seed.plan, startDate: seed.window.start },
    });
    const block = existing
      ? await db.block.update({ where: { id: existing.id }, data: blockData })
      : await db.block.create({ data: blockData });

    for (const d of seed.days) {
      const data = {
        workoutTypeId: typeIds.get(d.workout)!,
        trained: d.workoutDone,
        weight: d.weight,
        notes: d.notes.trim() === "" ? null : d.notes,
      };
      const day = await db.day.upsert({
        where: { blockId_date: { blockId: block.id, date: d.date } },
        update: data,
        create: { ...data, blockId: block.id, date: d.date },
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

    const dayCount = await db.day.count({ where: { blockId: block.id } });
    console.log(
      `Seeded "${block.name}": ${typeIds.size} workout types, ${dayCount} days.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
