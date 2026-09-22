# Today Screen and Food Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` a Today screen for any date where a repeat meal logs in one tap, with weight, trained and notes, backed by server actions that create the Day row on first write.

**Architecture:** A server component `DayScreen` loads everything for one date in a single pass and hands it to small client components. Every write is a server action in `src/app/actions.ts` that validates with Zod, calls a pure-ish function in `src/lib/log.ts` (tested against the database directly), then `revalidatePath`s the day. Client components use `useOptimistic` so taps show instantly.

**Tech Stack:** Next.js 16 App Router (no Cache Components), React 19 `useOptimistic`/`useTransition`, Prisma 7 + Neon, Tailwind 4, Zod, Vitest, Playwright for screenshots.

**Spec:** `docs/superpowers/specs/2026-09-21-today-and-food-log-design.md`

## Global Constraints

- Read `docs/04-domain-rules.md` before touching anything that computes an average, a total or a streak. It is binding.
- Dates are `YYYY-MM-DD` strings, never timestamps; `today()` is Mountain time (`src/lib/dates.ts`).
- Empty is `null`, never `0` or `""`. Every user-visible number goes through `src/lib/format.ts`. Empty renders as `—`.
- Targets resolve via `targetsFor` in `src/lib/schedule.ts`: covering Block → Settings → null. Never a hardcoded number.
- Entries copy numbers (and the name) from items; editing an item never touches entries.
- A day-scoped write always calls `ensureDay(date)` first (`src/lib/days.ts`). Never gate logging on a block.
- No save buttons, no confirmation toasts, no checkbox beside the number it describes.
- Validation bounds: calories integer 0–5000; protein integer 0–500; weight 50–500 rounded to one decimal; name ≤ 80 characters.
- Touch targets ≥ 44px. 390px is the primary width. `inputmode` numeric/decimal on number fields. Visible focus. 150ms colour transitions only; `prefers-reduced-motion` already handled in `globals.css`.
- Design tokens in `src/app/globals.css` and `docs/03-design-system.md`: every number `font-mono`, labels use `.label`. **`docs/10-today-design.md` is the visual direction for this screen and overrides class names shown in the tasks below**: ruled rows on a shared five-column grid, not cards; mixed-case date and session; totals as `991 of 2,100`; trigger copy `All items and quick add`. Apply it as you build each component, not only in Task 8.
- Prisma client imports from `@/generated/prisma/client`; app code uses `db` from `@/lib/db`. Prisma is pinned to 7.10.0.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Never call the migration or seed against anything but the dev database in `.env.local`. This plan adds no migration.

## Review Focus

1. `/d/2026-02-30` — well-formed but impossible date. Expect a 404, never a page that logs to a neighbouring day. (Task 4)
2. Weight typed as `178.` or `178,2` or left blank — expect `178`, `178.2`, and `null` respectively, never a rejected save that silently keeps the old number. (Task 2, Task 5)
3. Notes saved as only spaces — expect `null` in the database and no "logged" state change. (Task 2)
4. An item archived after it has been logged today — expect today's entry row to keep its name and numbers. (Task 3)
5. Double-tapping Quick add's Log button — expect one entry, not two: the button disables while pending. (Task 7)

---

### Task 1: Pure math — remaining, trailing weight average, item order

**Files:**
- Modify: `src/lib/totals.ts`
- Create: `src/lib/weight.ts`, `src/lib/items.ts`
- Test: `src/lib/totals.test.ts`, `src/lib/weight.test.ts`, `src/lib/items.test.ts`

**Interfaces:**
- Consumes: `addDays`, `eachDate` from `src/lib/dates.ts`; `Totals` from `src/lib/totals.ts`.
- Produces:
  - `remaining(total: number | null, target: number | null): Remaining` where `type Remaining = { kind: "left"; amount: number } | { kind: "over"; amount: number } | { kind: "none" }`
  - `trailingAverage(readings: ReadonlyArray<{ date: string; weight: number }>, date: string, windowDays?: number): { average: number; count: number } | null`
  - `orderItems<T extends { timesUsed: number; lastUsed: Date | null; archived: boolean }>(items: readonly T[]): T[]`
  - `topItems<T>(ordered: readonly T[], n?: number): T[]`

- [ ] **Step 1: Write the failing tests for `remaining`**

Append to `src/lib/totals.test.ts`:

```ts
import { remaining } from "./totals";

describe("remaining", () => {
  it("is what's left when under target", () => {
    expect(remaining(991, 2100)).toEqual({ kind: "left", amount: 1109 });
  });

  it("is over when past target", () => {
    expect(remaining(2220, 2100)).toEqual({ kind: "over", amount: 120 });
  });

  it("treats exactly on target as 0 left, not over", () => {
    expect(remaining(2100, 2100)).toEqual({ kind: "left", amount: 0 });
  });

  it("is the whole target when nothing is logged (empty is not zero, R6)", () => {
    expect(remaining(null, 2100)).toEqual({ kind: "left", amount: 2100 });
  });

  it("is none when there is no target (R6b: never a hardcoded number)", () => {
    expect(remaining(991, null)).toEqual({ kind: "none" });
    expect(remaining(null, null)).toEqual({ kind: "none" });
  });
});
```

Move the `import { remaining }` line up to sit with the existing `import { dayTotals } from "./totals";` — combine them into `import { dayTotals, remaining } from "./totals";`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/totals.test.ts`
Expected: FAIL — `remaining` is not exported.

- [ ] **Step 3: Implement `remaining`**

Append to `src/lib/totals.ts`:

```ts
export type Remaining =
  | { kind: "left"; amount: number }
  | { kind: "over"; amount: number }
  | { kind: "none" };

/** What's left against a target. No target means nothing to say (rule R6b). */
export function remaining(total: number | null, target: number | null): Remaining {
  if (target == null) return { kind: "none" };
  const diff = target - (total ?? 0);
  return diff >= 0 ? { kind: "left", amount: diff } : { kind: "over", amount: -diff };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/totals.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing tests for `trailingAverage`**

Create `src/lib/weight.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { trailingAverage } from "./weight";

const r = (date: string, weight: number) => ({ date, weight });

describe("trailingAverage", () => {
  it("averages the readings in the last 7 calendar days, inclusive", () => {
    const readings = [
      r("2026-09-15", 180.0),
      r("2026-09-16", 179.6),
      r("2026-09-17", 179.9),
      r("2026-09-18", 179.2),
      r("2026-09-19", 178.8),
      r("2026-09-20", 179.0),
      r("2026-09-21", 178.2),
    ];
    // (180.0+179.6+179.9+179.2+178.8+179.0+178.2)/7 = 1254.7/7 = 179.242857…
    expect(trailingAverage(readings, "2026-09-21")).toEqual({
      average: 1254.7 / 7,
      count: 7,
    });
  });

  it("does not widen the window to find 7 readings (R4)", () => {
    // Only 4 readings inside 2026-09-15..21; the 09-10 one is outside.
    const readings = [
      r("2026-09-10", 185.0),
      r("2026-09-16", 179.6),
      r("2026-09-18", 179.2),
      r("2026-09-20", 179.0),
      r("2026-09-21", 178.2),
    ];
    expect(trailingAverage(readings, "2026-09-21")).toEqual({
      average: (179.6 + 179.2 + 179.0 + 178.2) / 4,
      count: 4,
    });
  });

  it("ignores readings after the date", () => {
    const readings = [r("2026-09-21", 178.2), r("2026-09-22", 177.0)];
    expect(trailingAverage(readings, "2026-09-21")).toEqual({ average: 178.2, count: 1 });
  });

  it("is null with no readings in the window", () => {
    expect(trailingAverage([r("2026-09-01", 180)], "2026-09-21")).toBeNull();
    expect(trailingAverage([], "2026-09-21")).toBeNull();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/lib/weight.test.ts`
Expected: FAIL — cannot find module `./weight`.

- [ ] **Step 7: Implement `trailingAverage`**

Create `src/lib/weight.ts`:

```ts
// The 7-day rolling average is the number (rule R4). The window is the last
// N calendar days ending on `date`, inclusive — missed days shrink the
// sample, they never widen the window.

import { addDays, type DateString } from "./dates";

export type WeightReading = { date: DateString; weight: number };

export function trailingAverage(
  readings: ReadonlyArray<WeightReading>,
  date: DateString,
  windowDays = 7,
): { average: number; count: number } | null {
  const from = addDays(date, -(windowDays - 1));
  const inWindow = readings.filter((r) => r.date >= from && r.date <= date);
  if (inWindow.length === 0) return null;
  const sum = inWindow.reduce((acc, r) => acc + r.weight, 0);
  return { average: sum / inWindow.length, count: inWindow.length };
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/lib/weight.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing tests for item ordering**

Create `src/lib/items.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { orderItems, topItems } from "./items";

const item = (name: string, timesUsed: number, lastUsed: string | null, archived = false) => ({
  name,
  timesUsed,
  lastUsed: lastUsed ? new Date(lastUsed) : null,
  archived,
});

describe("orderItems", () => {
  it("puts the most-used first, not alphabetical", () => {
    const out = orderItems([item("Apple", 1, null), item("Konala bowl", 9, null)]);
    expect(out.map((i) => i.name)).toEqual(["Konala bowl", "Apple"]);
  });

  it("breaks ties by most recently used, never-used last", () => {
    const out = orderItems([
      item("Never", 3, null),
      item("Older", 3, "2026-09-01T12:00:00Z"),
      item("Newer", 3, "2026-09-20T12:00:00Z"),
    ]);
    expect(out.map((i) => i.name)).toEqual(["Newer", "Older", "Never"]);
  });

  it("drops archived items", () => {
    const out = orderItems([item("Gone", 50, null, true), item("Here", 1, null)]);
    expect(out.map((i) => i.name)).toEqual(["Here"]);
  });

  it("does not mutate its input", () => {
    const input = [item("B", 1, null), item("A", 2, null)];
    orderItems(input);
    expect(input[0].name).toBe("B");
  });
});

describe("topItems", () => {
  it("takes the first six by default", () => {
    const ordered = Array.from({ length: 10 }, (_, i) => item(`i${i}`, 10 - i, null));
    expect(topItems(ordered).map((i) => i.name)).toEqual(["i0", "i1", "i2", "i3", "i4", "i5"]);
  });

  it("returns fewer when fewer exist", () => {
    expect(topItems([item("only", 1, null)])).toHaveLength(1);
  });
});
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `npx vitest run src/lib/items.test.ts`
Expected: FAIL — cannot find module `./items`.

- [ ] **Step 11: Implement item ordering**

Create `src/lib/items.ts`:

```ts
// Saved items order by use, most-used at the top where the thumb is
// (docs/07-food-log.md). Not alphabetical, not recency alone.

type Orderable = { timesUsed: number; lastUsed: Date | null; archived: boolean };

export function orderItems<T extends Orderable>(items: readonly T[]): T[] {
  return items
    .filter((i) => !i.archived)
    .slice()
    .sort((a, b) => {
      if (b.timesUsed !== a.timesUsed) return b.timesUsed - a.timesUsed;
      const at = a.lastUsed?.getTime() ?? -Infinity;
      const bt = b.lastUsed?.getTime() ?? -Infinity;
      return bt - at;
    });
}

/** The inline "LOG" rows on Today: the first `n` of an already-ordered list. */
export function topItems<T>(ordered: readonly T[], n = 6): T[] {
  return ordered.slice(0, n);
}
```

- [ ] **Step 12: Run all tests, typecheck, lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all pass, 0 errors.

- [ ] **Step 13: Commit**

```bash
git add src/lib/totals.ts src/lib/totals.test.ts src/lib/weight.ts src/lib/weight.test.ts src/lib/items.ts src/lib/items.test.ts
git commit -m "Add remaining, trailing weight average and item ordering

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Validation schemas with Zod

**Files:**
- Modify: `package.json` (add `zod`)
- Create: `src/lib/validate.ts`
- Test: `src/lib/validate.test.ts`

**Interfaces:**
- Consumes: `isDateString` from `src/lib/dates.ts`.
- Produces (all Zod schemas, exported):
  - `dateSchema` → `string`
  - `caloriesSchema` → `number` (int 0–5000)
  - `proteinSchema` → `number` (int 0–500)
  - `weightSchema` → `number | null` (accepts number, numeric string, `""`, `null`; rounds to 1 decimal; 50–500)
  - `notesSchema` → `string | null` (trimmed; empty → null; ≤ 2000 chars)
  - `nameSchema` → `string` (trimmed, 1–80 chars)
  - `quickAddSchema` → `{ calories: number; protein: number; name: string | null; save: boolean }` (refines: `save` requires a name)
  - `itemInputSchema` → `{ id?: string; name: string; calories: number; protein: number }`
  - `entryNumbersSchema` → `{ calories: number; protein: number }`

- [ ] **Step 1: Install Zod**

Run: `npm install zod@^4`
Expected: `zod` appears in `package.json` dependencies.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  caloriesSchema,
  dateSchema,
  nameSchema,
  notesSchema,
  proteinSchema,
  quickAddSchema,
  weightSchema,
} from "./validate";

describe("dateSchema", () => {
  it("accepts a real calendar date and rejects the rest", () => {
    expect(dateSchema.parse("2026-09-21")).toBe("2026-09-21");
    expect(() => dateSchema.parse("2026-02-30")).toThrow();
    expect(() => dateSchema.parse("2026-9-21")).toThrow();
    expect(() => dateSchema.parse("2026-09-21T00:00:00Z")).toThrow();
  });
});

describe("caloriesSchema / proteinSchema", () => {
  it("accepts integers within bounds", () => {
    expect(caloriesSchema.parse(0)).toBe(0);
    expect(caloriesSchema.parse(5000)).toBe(5000);
    expect(proteinSchema.parse(500)).toBe(500);
  });

  it("rejects negatives, fractions and out-of-range", () => {
    expect(() => caloriesSchema.parse(-1)).toThrow();
    expect(() => caloriesSchema.parse(5001)).toThrow();
    expect(() => caloriesSchema.parse(12.5)).toThrow();
    expect(() => proteinSchema.parse(501)).toThrow();
  });
});

describe("weightSchema", () => {
  it("rounds to one decimal", () => {
    expect(weightSchema.parse(178.26)).toBe(178.3);
    expect(weightSchema.parse(178)).toBe(178);
  });

  it("accepts what a phone keypad produces", () => {
    expect(weightSchema.parse("178.")).toBe(178);
    expect(weightSchema.parse("178,2")).toBe(178.2);
    expect(weightSchema.parse(" 178.2 ")).toBe(178.2);
  });

  it("treats empty as null, never zero", () => {
    expect(weightSchema.parse("")).toBeNull();
    expect(weightSchema.parse(null)).toBeNull();
  });

  it("rejects nonsense and out-of-range", () => {
    expect(() => weightSchema.parse("abc")).toThrow();
    expect(() => weightSchema.parse(49.9)).toThrow();
    expect(() => weightSchema.parse(500.1)).toThrow();
  });
});

describe("notesSchema", () => {
  it("trims, and turns whitespace-only into null", () => {
    expect(notesSchema.parse("  legs heavy ")).toBe("legs heavy");
    expect(notesSchema.parse("   ")).toBeNull();
    expect(notesSchema.parse("")).toBeNull();
  });
});

describe("nameSchema", () => {
  it("requires 1–80 characters after trimming", () => {
    expect(nameSchema.parse(" Large egg ")).toBe("Large egg");
    expect(() => nameSchema.parse("  ")).toThrow();
    expect(() => nameSchema.parse("x".repeat(81))).toThrow();
  });
});

describe("quickAddSchema", () => {
  it("allows a nameless one-off", () => {
    expect(quickAddSchema.parse({ calories: 800, protein: 0, save: false })).toEqual({
      calories: 800,
      protein: 0,
      name: null,
      save: false,
    });
  });

  it("requires a name when saving to the list", () => {
    expect(() => quickAddSchema.parse({ calories: 800, protein: 0, save: true })).toThrow();
    expect(
      quickAddSchema.parse({ calories: 800, protein: 0, name: "Dinner", save: true }),
    ).toMatchObject({ name: "Dinner", save: true });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/validate.test.ts`
Expected: FAIL — cannot find module `./validate`.

- [ ] **Step 4: Implement the schemas**

Create `src/lib/validate.ts`:

```ts
// Every server action validates through here. Bounds are from the spec:
// calories 0–5000, protein 0–500, weight 50–500 to one decimal, name ≤ 80.

import { z } from "zod";
import { isDateString } from "./dates";

export const dateSchema = z.string().refine(isDateString, "Not a calendar date");

export const caloriesSchema = z.number().int().min(0).max(5000);
export const proteinSchema = z.number().int().min(0).max(500);

// Accepts what a phone keypad produces: "178.", "178,2", "", or a number.
// Empty is null, never zero (rule R6).
export const weightSchema = z
  .union([z.number(), z.string(), z.null()])
  .transform((v, ctx) => {
    if (v === null) return null;
    if (typeof v === "string") {
      const s = v.trim().replace(",", ".");
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: "custom", message: "Not a number" });
        return z.NEVER;
      }
      v = n;
    }
    const rounded = Math.round(v * 10) / 10;
    if (rounded < 50 || rounded > 500) {
      ctx.addIssue({ code: "custom", message: "Weight must be 50–500 lb" });
      return z.NEVER;
    }
    return rounded;
  });

export const notesSchema = z
  .string()
  .max(2000)
  .transform((s) => {
    const t = s.trim();
    return t === "" ? null : t;
  });

export const nameSchema = z.string().trim().min(1).max(80);

export const entryNumbersSchema = z.object({
  calories: caloriesSchema,
  protein: proteinSchema,
});

export const quickAddSchema = z
  .object({
    calories: caloriesSchema,
    protein: proteinSchema,
    name: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((s) => (s ? s : null)),
    save: z.boolean(),
  })
  .refine((v) => !v.save || v.name !== null, {
    message: "A saved item needs a name",
    path: ["name"],
  });

export const itemInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: nameSchema,
  calories: caloriesSchema,
  protein: proteinSchema,
});

export type QuickAddInput = z.input<typeof quickAddSchema>;
export type ItemInput = z.input<typeof itemInputSchema>;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/validate.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/validate.ts src/lib/validate.test.ts
git commit -m "Add Zod validation schemas for logging inputs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Write functions in `src/lib/log.ts`, tested against the database

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `src/lib/log.ts`
- Test: `src/lib/log.db.test.ts`

**Interfaces:**
- Consumes: `db` from `src/lib/db.ts`; `ensureDay(date)` from `src/lib/days.ts`.
- Produces (all `async`, all use the `db` singleton):
  - `logItem(date: string, itemId: string): Promise<{ id: string }>`
  - `quickAdd(date: string, input: { calories: number; protein: number; name: string | null; save: boolean }): Promise<{ id: string }>`
  - `updateEntry(entryId: string, input: { calories: number; protein: number }): Promise<void>`
  - `removeEntry(entryId: string): Promise<void>`
  - `setWeight(date: string, lbs: number | null): Promise<void>`
  - `setTrained(date: string, trained: boolean): Promise<void>`
  - `saveNotes(date: string, notes: string | null): Promise<void>`
  - `upsertItem(input: { id?: string; name: string; calories: number; protein: number }): Promise<{ id: string }>`
  - `archiveItem(id: string): Promise<void>`

These tests write to the dev database in `.env.local`. They use dates in January 2000, which no real data touches, and delete everything they create.

- [ ] **Step 1: Add a Vitest config that resolves `@/` and loads `.env.local`**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Database tests are slow and need DATABASE_URL; they run in-band.
    fileParallelism: false,
  },
});
```

Create `vitest.setup.ts`:

```ts
import { config } from "dotenv";

config({ path: ".env.local" });
```

Run: `npm test`
Expected: the existing 4 files still pass.

- [ ] **Step 2: Write the failing database tests**

Create `src/lib/log.db.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/log.db.test.ts`
Expected: FAIL — cannot find module `./log`.

- [ ] **Step 4: Implement `src/lib/log.ts`**

```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/log.db.test.ts`
Expected: PASS, 11 tests. Then confirm nothing is left behind:

Run: `npx tsx -e 'import {config} from "dotenv";config({path:".env.local"});const {db}=await import("./src/lib/db");console.log(await db.day.count({where:{date:{startsWith:"2000-"}}}), await db.foodItem.count({where:{name:{startsWith:"__test__"}}}));await db.$disconnect()'`
Expected: `0 0`.

- [ ] **Step 6: Run everything, typecheck, lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts src/lib/log.ts src/lib/log.db.test.ts
git commit -m "Add log write functions with database tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Read model and routes — `/`, `/d/[date]`, `/block`; DayScreen skeleton

**Files:**
- Create: `src/lib/day-screen.ts`, `src/app/d/[date]/page.tsx`, `src/app/block/page.tsx`, `src/components/day/DayScreen.tsx`, `src/components/day/Remaining.tsx`
- Modify: `src/app/page.tsx` (becomes Today), `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: `today`, `addDays`, `isDateString` (`src/lib/dates.ts`); `workoutTypeIdFor`, `targetsFor`, `blocksCovering` (`src/lib/schedule.ts`); `dayTotals`, `remaining` (`src/lib/totals.ts`); `trailingAverage` (`src/lib/weight.ts`); `orderItems`, `topItems` (`src/lib/items.ts`).
- Produces:
  - `loadDayScreen(date: string): Promise<DayScreenData>`
  - `type DayScreenData = { date: string; isToday: boolean; sessionName: string | null; isRest: boolean; blockName: string | null; targets: { calTarget: number | null; proteinTarget: number | null }; day: { trained: boolean; weight: number | null; notes: string | null } | null; entries: EntryView[]; weightAvg: { average: number; count: number } | null; items: ItemView[]; topItems: ItemView[] }`
  - `type EntryView = { id: string; name: string | null; calories: number; protein: number }`
  - `type ItemView = { id: string; name: string; calories: number; protein: number }`
  - `routeFor(date: string): string` — `"/"` for today, else `/d/${date}`
  - `formatSigned`-free: `formatAvgLabel(count: number): string` → `"7-day"` / `"4-day"`
  - `<DayScreen date />` server component; `<Remaining totals targets />` server component.

- [ ] **Step 1: Write the failing tests for the two small helpers**

Append to `src/lib/format.test.ts` (add `formatAvgLabel` to the existing import from `./format`):

```ts
describe("formatAvgLabel", () => {
  it("names the window by how many readings it holds (R4)", () => {
    expect(formatAvgLabel(7)).toBe("7-day");
    expect(formatAvgLabel(4)).toBe("4-day");
    expect(formatAvgLabel(1)).toBe("1-day");
  });
});
```

Create the test for `routeFor` in a new file `src/lib/day-screen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { routeFor } from "./day-screen";

describe("routeFor", () => {
  it("sends today to / and any other date to /d/<date>", () => {
    expect(routeFor("2026-09-20", "2026-09-21")).toBe("/d/2026-09-20");
    expect(routeFor("2026-09-21", "2026-09-21")).toBe("/");
    expect(routeFor("2026-09-22", "2026-09-21")).toBe("/d/2026-09-22");
  });
});
```

(`routeFor` takes the current date as a second argument so it's testable; callers pass `today()`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/format.test.ts src/lib/day-screen.test.ts`
Expected: FAIL — `formatAvgLabel` not exported; `./day-screen` not found.

- [ ] **Step 3: Add `formatAvgLabel` and the read model**

Append to `src/lib/format.ts`:

```ts
/** "7-day", or "4-day" when the window is short (rule R4). */
export function formatAvgLabel(count: number): string {
  return `${count}-day`;
}
```

Create `src/lib/day-screen.ts`:

```ts
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

  const typeId =
    settings && workoutTypeIdFor(date, settings, day?.workoutTypeId ?? null);
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/format.test.ts src/lib/day-screen.test.ts`
Expected: PASS.

- [ ] **Step 5: Move the current day list to `/block`**

Run: `mkdir -p src/app/block && git mv src/app/page.tsx src/app/block/page.tsx`

Open `src/app/block/page.tsx` and change nothing except the component name for clarity: `export default async function Home()` → `export default async function BlockPage()`.

- [ ] **Step 6: Create the `Remaining` component**

Create `src/components/day/Remaining.tsx`:

```tsx
import { formatGrams, formatKcal } from "@/lib/format";
import { remaining, type Totals } from "@/lib/totals";

type Targets = { calTarget: number | null; proteinTarget: number | null };

// Remaining leads; totals report (docs/09-design-brief.md). Over target is
// stated in --danger and nothing else changes — never scold.
export function Remaining({ totals, targets }: { totals: Totals; targets: Targets }) {
  const kcal = remaining(totals.calories, targets.calTarget);
  const prot = remaining(totals.protein, targets.proteinTarget);

  return (
    <section aria-label="Remaining today" className="mt-5">
      <p className="flex items-baseline justify-between font-display text-2xl font-semibold tracking-wide text-parchment">
        <Headline r={kcal} unit="" fallback={formatKcal(totals.calories)} suffix=" left" />
        <Headline r={prot} unit="g" fallback={formatGrams(totals.protein)} suffix=" to go" />
      </p>
      <p className="mt-1 flex justify-between font-mono text-sm text-ink-dim tabular-nums">
        <span>
          {formatKcal(totals.calories)} / {formatKcal(targets.calTarget)} kcal
        </span>
        <span>
          {formatGrams(totals.protein)} / {formatGrams(targets.proteinTarget)} g
        </span>
      </p>
    </section>
  );
}

function Headline({
  r,
  unit,
  fallback,
  suffix,
}: {
  r: ReturnType<typeof remaining>;
  unit: string;
  fallback: string;
  suffix: string;
}) {
  if (r.kind === "none") return <span className="font-mono tabular-nums">{fallback}{unit}</span>;
  const n = unit === "g" ? formatGrams(r.amount) : formatKcal(r.amount);
  if (r.kind === "over") {
    return (
      <span className="text-danger">
        <span className="font-mono tabular-nums">{n}{unit}</span> over
      </span>
    );
  }
  return (
    <span>
      <span className="font-mono tabular-nums">{n}{unit}</span>
      {suffix}
    </span>
  );
}
```

- [ ] **Step 7: Create the `DayScreen` skeleton (header, session, remaining, plain lists)**

This task renders the read model with no interactivity yet; Tasks 5–7 replace the placeholders with client components. Create `src/components/day/DayScreen.tsx`:

```tsx
import Link from "next/link";
import { addDays } from "@/lib/dates";
import { loadDayScreen, routeFor } from "@/lib/day-screen";
import {
  formatAvgLabel,
  formatGrams,
  formatKcal,
  formatShortDate,
  formatWeekday,
  formatWeight,
} from "@/lib/format";
import { dayTotals } from "@/lib/totals";
import { Remaining } from "./Remaining";

export async function DayScreen({ date }: { date: string }) {
  const data = await loadDayScreen(date);
  const totals = dayTotals(data.entries);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      <header className={`rounded-card border-l-2 pl-3 ${data.isToday ? "border-l-rust" : "border-l-line"}`}>
        <nav className="flex min-h-11 items-center justify-between" aria-label="Change day">
          <Link href={routeFor(addDays(date, -1))} className="flex min-h-11 min-w-11 items-center justify-center font-mono text-ink-dim" aria-label="Previous day">
            ‹
          </Link>
          <p className="label text-center">
            {formatWeekday(date)} {formatShortDate(date)}
            {data.isToday && " · Today"}
            {data.blockName && ` · ${data.blockName}`}
          </p>
          <Link href={routeFor(addDays(date, 1))} className="flex min-h-11 min-w-11 items-center justify-center font-mono text-ink-dim" aria-label="Next day">
            ›
          </Link>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className={`font-display text-3xl font-semibold tracking-wide uppercase ${data.isRest ? "text-ink-dim" : "text-parchment"}`}>
            {data.sessionName ?? "—"}
          </h1>
          {/* Task 5 replaces this with the Trained toggle */}
          <span className="label">{data.day?.trained ? "Trained ✓" : "Trained"}</span>
        </div>

        <Remaining totals={totals} targets={data.targets} />

        <p className="mt-3 flex items-baseline gap-3 font-mono text-sm text-ink-dim tabular-nums">
          <span className="label">Weight</span>
          {/* Task 5 replaces this with the WeightField */}
          <span className="text-lg text-ink">{formatWeight(data.day?.weight)}</span>
          {data.weightAvg && (
            <span>
              · {formatAvgLabel(data.weightAvg.count)} {formatWeight(data.weightAvg.average)}
            </span>
          )}
        </p>
      </header>

      {data.entries.length > 0 && (
        <section className="mt-6" aria-label="Logged">
          <p className="label mb-2">Logged</p>
          {/* Task 6 replaces this with DayLog */}
          <ul className="space-y-1.5">
            {data.entries.map((e) => (
              <li key={e.id} className="flex min-h-11 items-center justify-between rounded-card border-l-2 border-l-moss bg-surface px-3">
                <span className="truncate">{e.name ?? "Quick add"}</span>
                <span className="font-mono text-sm text-ink-dim tabular-nums">
                  {formatKcal(e.calories)} · {formatGrams(e.protein)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-label="Log">
        <p className="label mb-2">Log</p>
        <ul className="space-y-1.5">
          {data.topItems.map((i) => (
            <li key={i.id} className="flex min-h-11 items-center justify-between rounded-card border-l-2 border-l-line bg-surface px-3">
              <span className="truncate">{i.name}</span>
              <span className="font-mono text-sm text-ink-dim tabular-nums">
                {formatKcal(i.calories)} · {formatGrams(i.protein)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" aria-label="Notes">
        <p className="label mb-2">Notes</p>
        {/* Task 5 replaces this with NotesField */}
        <p className="min-h-11 text-ink-dim">{data.day?.notes ?? ""}</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 8: Create the routes**

Create `src/app/page.tsx`:

```tsx
import { connection } from "next/server";
import { DayScreen } from "@/components/day/DayScreen";
import { today } from "@/lib/dates";

// Today is the default route. It never redirects: the home-screen icon
// always lands on a page to write on (docs/09-design-brief.md).
export default async function TodayPage() {
  await connection();
  return <DayScreen date={today()} />;
}
```

Create `src/app/d/[date]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DayScreen } from "@/components/day/DayScreen";
import { isDateString } from "@/lib/dates";

// Any calendar date, past or future, renders the same screen (rule R1c).
// A malformed or impossible date is a 404, never a fallback to another day.
export default async function DayPage(props: PageProps<"/d/[date]">) {
  await connection();
  const { date } = await props.params;
  if (!isDateString(date)) notFound();
  return <DayScreen date={date} />;
}
```

- [ ] **Step 9: Typecheck, lint, run, look**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors. (`PageProps<"/d/[date]">` is generated by `next typegen`, which `npm run typecheck` runs first.)

Start the dev server if it isn't running (`npm run dev` in the background), then:

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ http://localhost:3000/d/2026-09-11 http://localhost:3000/d/2026-02-30 http://localhost:3000/block`
Expected: `200`, `200`, `404`, `200`.

Run: `node scripts/shot.mjs / today-skeleton && node scripts/shot.mjs /d/2026-09-11 past-skeleton`
Read `.shots/today-skeleton-mobile.png`: header with ‹ ›, "MON SEP 21 · TODAY", session name, "2,100 left · 150g to go" (nothing logged), dashes for totals, six LOG rows, nothing under LOGGED.

- [ ] **Step 10: Commit**

```bash
git add src/app/page.tsx src/app/d src/app/block src/components/day src/lib/day-screen.ts src/lib/day-screen.test.ts src/lib/format.ts src/lib/format.test.ts
git commit -m "Add Today routes and read model; move day list to /block

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Server actions, date picker, Trained toggle, Weight field, Notes field

**Files:**
- Create: `src/app/actions.ts`, `src/components/day/DateNav.tsx`, `src/components/day/TrainedToggle.tsx`, `src/components/day/WeightField.tsx`, `src/components/day/NotesField.tsx`, `src/components/day/SaveError.tsx`
- Modify: `src/components/day/DayScreen.tsx`

**Interfaces:**
- Consumes: `src/lib/log.ts` functions; schemas from `src/lib/validate.ts`; `routeFor` from `src/lib/day-screen.ts`.
- Produces `src/app/actions.ts` (`"use server"`), every function `async` and throwing on invalid input:
  - `logItemAction(date: string, itemId: string): Promise<void>`
  - `quickAddAction(date: string, input: { calories: number; protein: number; name?: string; save: boolean }): Promise<void>`
  - `updateEntryAction(date: string, entryId: string, input: { calories: number; protein: number }): Promise<void>`
  - `removeEntryAction(date: string, entryId: string): Promise<void>`
  - `setWeightAction(date: string, raw: string | number | null): Promise<number | null>` — returns the parsed value
  - `setTrainedAction(date: string, trained: boolean): Promise<void>`
  - `saveNotesAction(date: string, text: string): Promise<void>`
  - `upsertItemAction(date: string, input: { id?: string; name: string; calories: number; protein: number }): Promise<void>`
  - `archiveItemAction(date: string, id: string): Promise<void>`
  - Also: `<SaveError onRetry />` — the inline "Didn't save — tap to retry" row used by every client component.

- [ ] **Step 1: Write the server actions**

Create `src/app/actions.ts`:

```ts
"use server";

// Thin wrappers: validate, call src/lib/log, revalidate the day. The date is
// always passed so the right route re-renders. Invalid input throws; the
// client shows an inline retry (spec: Errors).

import { revalidatePath } from "next/cache";
import { routeFor } from "@/lib/day-screen";
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
): Promise<void> {
  const d = dateSchema.parse(date);
  await log.upsertItem(itemInputSchema.parse(input));
  revalidateDay(d);
}

export async function archiveItemAction(date: string, id: string): Promise<void> {
  const d = dateSchema.parse(date);
  await log.archiveItem(id);
  revalidateDay(d);
}
```

- [ ] **Step 2: Create the shared inline error**

Create `src/components/day/SaveError.tsx`:

```tsx
"use client";

// The only error UI for routine entry: one line, in --danger, tap to retry.
// No modal, no toast (spec: Errors).
export function SaveError({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mt-1 flex min-h-11 w-full items-center rounded-card px-3 text-left font-mono text-sm text-danger"
    >
      Didn't save — tap to retry
    </button>
  );
}
```

- [ ] **Step 3: Create the date navigation**

Create `src/components/day/DateNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, isDateString } from "@/lib/dates";
import { routeFor } from "@/lib/day-screen";
import { formatShortDate, formatWeekday } from "@/lib/format";

// ‹ › step a day. The date itself is a native <input type="date"> styled as
// text, so the phone's own picker does the jumping (rule R1c). No library.
export function DateNav({
  date,
  isToday,
  blockName,
}: {
  date: string;
  isToday: boolean;
  blockName: string | null;
}) {
  const router = useRouter();
  const label = `${formatWeekday(date)} ${formatShortDate(date)}${isToday ? " · Today" : ""}${
    blockName ? ` · ${blockName}` : ""
  }`;

  return (
    <nav className="flex min-h-11 items-center justify-between" aria-label="Change day">
      <Link
        href={routeFor(addDays(date, -1))}
        className="flex min-h-11 min-w-11 items-center justify-center font-mono text-lg text-ink-dim"
        aria-label="Previous day"
      >
        ‹
      </Link>
      <label className="relative flex min-h-11 items-center">
        <span className="label uppercase">{label}</span>
        <input
          type="date"
          value={date}
          aria-label="Pick a date"
          onChange={(e) => {
            const v = e.target.value;
            if (isDateString(v)) router.push(routeFor(v));
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Link
        href={routeFor(addDays(date, 1))}
        className="flex min-h-11 min-w-11 items-center justify-center font-mono text-lg text-ink-dim"
        aria-label="Next day"
      >
        ›
      </Link>
    </nav>
  );
}
```

- [ ] **Step 4: Create the Trained toggle**

Create `src/components/day/TrainedToggle.tsx`:

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setTrainedAction } from "@/app/actions";
import { SaveError } from "./SaveError";

// One ≥44px button labelled with its state, moss when on. Not a checkbox
// beside text (docs/09-design-brief.md: no ceremony).
export function TrainedToggle({ date, trained }: { date: string; trained: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(trained);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const toggle = () =>
    startTransition(async () => {
      const next = !optimistic;
      setOptimistic(next);
      setFailed(false);
      try {
        await setTrainedAction(date, next);
      } catch {
        setFailed(true);
      }
    });

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={optimistic}
        className={`min-h-11 rounded-card border px-3 font-mono text-sm tracking-wider uppercase transition-colors duration-150 ${
          optimistic
            ? "border-moss bg-moss/15 text-moss"
            : "border-line text-ink-dim"
        }`}
      >
        {optimistic ? "Trained ✓" : "Trained"}
      </button>
      {failed && <SaveError onRetry={toggle} />}
    </div>
  );
}
```

- [ ] **Step 5: Create the Weight field**

Create `src/components/day/WeightField.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { setWeightAction } from "@/app/actions";
import { formatAvgLabel, formatWeight } from "@/lib/format";
import { SaveError } from "./SaveError";

// The 6am target. Tapping the number swaps in a decimal input pre-filled
// with the current value; blur or Enter saves; empty saves null. The
// trailing average sits beside it because the average leads (rule R4).
export function WeightField({
  date,
  weight,
  avg,
}: {
  date: string;
  weight: number | null;
  avg: { average: number; count: number } | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState<number | null>(weight);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const open = () => {
    setDraft(weight == null ? "" : String(weight));
    setInvalid(false);
    setEditing(true);
  };

  const save = (raw: string) => {
    setEditing(false);
    const cleaned = raw.trim().replace(",", ".");
    if (cleaned !== "" && !Number.isFinite(Number(cleaned))) {
      setInvalid(true);
      return;
    }
    const previous = shown;
    setShown(cleaned === "" ? null : Math.round(Number(cleaned) * 10) / 10);
    setFailed(null);
    startTransition(async () => {
      try {
        setShown(await setWeightAction(date, raw));
      } catch {
        setShown(previous);
        setFailed(raw);
      }
    });
  };

  return (
    <div className="mt-3">
      <p className="flex items-baseline gap-3 font-mono text-sm text-ink-dim tabular-nums">
        <span className="label">Weight</span>
        {editing ? (
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => save(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label="Weight in pounds"
            className="w-24 rounded-card border border-line bg-bg-alt px-2 py-1 text-lg text-ink"
          />
        ) : (
          <button
            type="button"
            onClick={open}
            aria-label="Edit weight"
            className={`min-h-11 min-w-16 rounded-card text-left text-lg ${
              invalid ? "outline outline-2 outline-rust" : ""
            } text-ink`}
          >
            {formatWeight(shown)}
          </button>
        )}
        {avg && (
          <span>
            · {formatAvgLabel(avg.count)} {formatWeight(avg.average)}
          </span>
        )}
      </p>
      {failed !== null && <SaveError onRetry={() => save(failed)} />}
    </div>
  );
}
```

- [ ] **Step 6: Create the Notes field**

Create `src/components/day/NotesField.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { saveNotesAction } from "@/app/actions";
import { SaveError } from "./SaveError";

// Saves on blur. No button.
export function NotesField({ date, notes }: { date: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  const save = () => {
    if (value.trim() === saved.trim()) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await saveNotesAction(date, value);
        setSaved(value);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <section className="mt-6" aria-label="Notes">
      <label className="label mb-2 block" htmlFor="notes">
        Notes
      </label>
      <textarea
        id="notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={2}
        placeholder="—"
        className="min-h-11 w-full resize-y rounded-card border border-line-soft bg-surface px-3 py-2 font-serif text-ink placeholder:text-ink-faint"
      />
      {failed && <SaveError onRetry={save} />}
    </section>
  );
}
```

- [ ] **Step 7: Wire them into `DayScreen`**

In `src/components/day/DayScreen.tsx`:

- Replace the `<nav>…</nav>` block with `<DateNav date={date} isToday={data.isToday} blockName={data.blockName} />`.
- Replace the `<span className="label">{data.day?.trained ? …}</span>` placeholder with `<TrainedToggle date={date} trained={data.day?.trained ?? false} />`.
- Replace the weight `<p>…</p>` block with `<WeightField date={date} weight={data.day?.weight ?? null} avg={data.weightAvg} />`.
- Replace the notes `<section>` with `<NotesField date={date} notes={data.day?.notes ?? null} />`.
- Update imports: add `import { DateNav } from "./DateNav";`, `TrainedToggle`, `WeightField`, `NotesField`; remove now-unused `Link`, `addDays`, `routeFor`, `formatAvgLabel`, `formatShortDate`, `formatWeekday`, `formatWeight`.

- [ ] **Step 8: Typecheck, lint, try it in the browser**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

With the dev server running, run this Playwright check from the scratchpad (adjust the path if the scratchpad differs):

```js
// scratchpad/check-task5.mjs
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://localhost:3000/d/2000-01-05", { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Edit weight" }).click();
await p.getByLabel("Weight in pounds").fill("178,26");
await p.keyboard.press("Enter");
await p.waitForTimeout(1500);
await p.getByRole("button", { name: /Trained/ }).click();
await p.waitForTimeout(1500);
await p.reload({ waitUntil: "networkidle" });
console.log(await p.getByRole("button", { name: "Edit weight" }).innerText()); // 178.3
console.log(await p.getByRole("button", { name: /Trained/ }).getAttribute("aria-pressed")); // true
await p.getByRole("link", { name: "Previous day" }).click();
await p.waitForURL("**/d/2000-01-04");
console.log(p.url());
await b.close();
```

Run: `node <scratchpad>/check-task5.mjs`
Expected: `178.3`, `true`, `http://localhost:3000/d/2000-01-04`.

Then clean the test day: `npx tsx -e 'import {config} from "dotenv";config({path:".env.local"});const {db}=await import("./src/lib/db");await db.day.deleteMany({where:{date:{startsWith:"2000-"}}});await db.$disconnect()'`

- [ ] **Step 9: Commit**

```bash
git add src/app/actions.ts src/components/day
git commit -m "Add server actions, date nav, trained toggle, weight and notes fields

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `DayLog` — logged entries with optimistic add/edit/remove, and the inline LOG rows

**Files:**
- Create: `src/components/day/DayLog.tsx`, `src/components/day/EntryRow.tsx`, `src/components/day/ItemRow.tsx`
- Modify: `src/components/day/DayScreen.tsx`

**Interfaces:**
- Consumes: `logItemAction`, `updateEntryAction`, `removeEntryAction`, `quickAddAction` from `src/app/actions.ts`; `EntryView`, `ItemView` from `src/lib/day-screen.ts`; `SaveError`.
- Produces:
  - `<DayLog date entries items topItems targets />` — client component owning optimistic entry state, rendering LOGGED, LOG and (Task 7) the sheet. It also renders `<Remaining>` so the headline updates optimistically; `DayScreen` stops rendering `Remaining` itself.
  - `type OptimisticEntry = EntryView & { pending?: boolean }`
  - `<ItemRow item onLog flash />` — a ≥44px row that logs on tap; used inline and in the sheet.
  - `<EntryRow entry onEdit onRemove />`.

- [ ] **Step 1: Create `ItemRow`**

Create `src/components/day/ItemRow.tsx`:

```tsx
"use client";

import { useState } from "react";
import { formatGrams, formatKcal } from "@/lib/format";
import type { ItemView } from "@/lib/day-screen";

// One tap logs it. The row flashes moss for 150ms; no toast. `trailing` is
// an optional slot for the sheet's ⋯ menu button.
export function ItemRow({
  item,
  onLog,
  trailing,
}: {
  item: ItemView;
  onLog: (item: ItemView) => void;
  trailing?: React.ReactNode;
}) {
  const [flash, setFlash] = useState(false);
  return (
    <li className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={() => {
          setFlash(true);
          setTimeout(() => setFlash(false), 150);
          onLog(item);
        }}
        className={`flex min-h-11 flex-1 items-center justify-between rounded-card border-l-2 px-3 text-left transition-colors duration-150 ${
          flash ? "border-l-moss bg-moss/15" : "border-l-line bg-surface"
        }`}
      >
        <span className="truncate pr-3 text-ink">{item.name}</span>
        <span className="shrink-0 font-mono text-sm text-ink-dim tabular-nums">
          {formatKcal(item.calories)} · {formatGrams(item.protein)}
        </span>
      </button>
      {trailing}
    </li>
  );
}
```

- [ ] **Step 2: Create `EntryRow`**

Create `src/components/day/EntryRow.tsx`:

```tsx
"use client";

import { useState } from "react";
import { formatGrams, formatKcal } from "@/lib/format";
import type { OptimisticEntry } from "./DayLog";

// Tap the row to edit its numbers in place — this entry only, never the
// saved item. ✕ removes it. Both targets ≥ 44px.
export function EntryRow({
  entry,
  onEdit,
  onRemove,
}: {
  entry: OptimisticEntry;
  onEdit: (id: string, numbers: { calories: number; protein: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cal, setCal] = useState(String(entry.calories));
  const [prot, setProt] = useState(String(entry.protein));
  const [invalid, setInvalid] = useState(false);

  const done = () => {
    const c = Number(cal);
    const p = Number(prot);
    const ok =
      Number.isInteger(c) && c >= 0 && c <= 5000 && Number.isInteger(p) && p >= 0 && p <= 500;
    if (!ok) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setEditing(false);
    if (c !== entry.calories || p !== entry.protein) onEdit(entry.id, { calories: c, protein: p });
  };

  const numberField = (
    value: string,
    set: (v: string) => void,
    label: string,
  ) => (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => set(e.target.value)}
      aria-label={label}
      className={`w-20 rounded-card border bg-bg-alt px-2 py-1 font-mono text-sm text-ink ${
        invalid ? "border-rust" : "border-line"
      }`}
    />
  );

  return (
    <li
      className={`rounded-card border-l-2 border-l-moss bg-surface ${entry.pending ? "opacity-60" : ""}`}
    >
      {editing ? (
        <div className="flex min-h-11 items-center gap-2 px-3 py-1.5">
          <span className="min-w-0 flex-1 truncate text-ink">{entry.name ?? "Quick add"}</span>
          {numberField(cal, setCal, "Calories")}
          {numberField(prot, setProt, "Protein grams")}
          <button
            type="button"
            onClick={done}
            className="min-h-11 rounded-card px-3 font-mono text-sm text-moss"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={entry.pending}
            aria-label={`Edit ${entry.name ?? "quick add"}`}
            className="flex min-h-11 flex-1 items-center justify-between px-3 text-left"
          >
            <span className="truncate pr-3 text-ink">{entry.name ?? "Quick add"}</span>
            <span className="shrink-0 font-mono text-sm text-ink-dim tabular-nums">
              {formatKcal(entry.calories)} · {formatGrams(entry.protein)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            disabled={entry.pending}
            aria-label={`Remove ${entry.name ?? "quick add"}`}
            className="flex min-h-11 min-w-11 items-center justify-center font-mono text-ink-faint"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 3: Create `DayLog`**

Create `src/components/day/DayLog.tsx`:

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  logItemAction,
  quickAddAction,
  removeEntryAction,
  updateEntryAction,
} from "@/app/actions";
import type { EntryView, ItemView } from "@/lib/day-screen";
import { dayTotals } from "@/lib/totals";
import { EntryRow } from "./EntryRow";
import { ItemRow } from "./ItemRow";
import { Remaining } from "./Remaining";
import { SaveError } from "./SaveError";

export type OptimisticEntry = EntryView & { pending?: boolean };

type Action =
  | { type: "add"; entry: OptimisticEntry }
  | { type: "edit"; id: string; calories: number; protein: number }
  | { type: "remove"; id: string };

function reduce(state: OptimisticEntry[], a: Action): OptimisticEntry[] {
  switch (a.type) {
    case "add":
      return [...state, a.entry];
    case "edit":
      return state.map((e) =>
        e.id === a.id ? { ...e, calories: a.calories, protein: a.protein, pending: true } : e,
      );
    case "remove":
      return state.filter((e) => e.id !== a.id);
  }
}

// Owns the day's entries. Every tap updates the list and the remaining
// headline immediately; the server render replaces it. A failed action
// reverts (useOptimistic does that when the transition settles) and shows
// one retry line.
export function DayLog({
  date,
  entries,
  topItems,
  targets,
  children,
}: {
  date: string;
  entries: EntryView[];
  topItems: ItemView[];
  targets: { calTarget: number | null; proteinTarget: number | null };
  children?: (log: (item: ItemView) => void, quickAdd: QuickAdd) => React.ReactNode;
}) {
  const [optimistic, dispatch] = useOptimistic(entries as OptimisticEntry[], reduce);
  const [, startTransition] = useTransition();
  const [retry, setRetry] = useState<(() => void) | null>(null);

  const run = (a: Action, fn: () => Promise<void>) => {
    const attempt = () =>
      startTransition(async () => {
        dispatch(a);
        setRetry(null);
        try {
          await fn();
        } catch {
          setRetry(() => attempt);
        }
      });
    attempt();
  };

  const log = (item: ItemView) =>
    run(
      {
        type: "add",
        entry: {
          id: `pending-${crypto.randomUUID()}`,
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          pending: true,
        },
      },
      () => logItemAction(date, item.id),
    );

  const quickAdd: QuickAdd = (input) =>
    run(
      {
        type: "add",
        entry: {
          id: `pending-${crypto.randomUUID()}`,
          name: input.name ?? null,
          calories: input.calories,
          protein: input.protein,
          pending: true,
        },
      },
      () => quickAddAction(date, input),
    );

  const edit = (id: string, n: { calories: number; protein: number }) =>
    run({ type: "edit", id, ...n }, () => updateEntryAction(date, id, n));

  const remove = (id: string) => run({ type: "remove", id }, () => removeEntryAction(date, id));

  return (
    <>
      <Remaining totals={dayTotals(optimistic)} targets={targets} />

      {optimistic.length > 0 && (
        <section className="mt-6" aria-label="Logged">
          <p className="label mb-2">Logged</p>
          <ul className="space-y-1.5">
            {optimistic.map((e) => (
              <EntryRow key={e.id} entry={e} onEdit={edit} onRemove={remove} />
            ))}
          </ul>
        </section>
      )}
      {retry && <SaveError onRetry={retry} />}

      <section className="mt-6" aria-label="Log">
        <p className="label mb-2">Log</p>
        <ul className="space-y-1.5">
          {topItems.map((i) => (
            <ItemRow key={i.id} item={i} onLog={log} />
          ))}
        </ul>
        {children?.(log, quickAdd)}
      </section>
    </>
  );
}

export type QuickAdd = (input: {
  calories: number;
  protein: number;
  name?: string;
  save: boolean;
}) => void;
```

- [ ] **Step 4: Wire `DayLog` into `DayScreen`**

`DayLog` owns the optimistic entries, so it must render `Remaining` (the headline changes on every tap). The weight field sits between Remaining and LOGGED in the layout, so `DayScreen` passes it as `children`.

In `src/components/day/DayScreen.tsx`:

- Delete the `<Remaining …/>` line, the `<WeightField …/>` line, the whole `{data.entries.length > 0 && (…)}` block, and the LOG `<section>`. The `<header>` card now ends right after the session/Trained row.
- After `</header>`, add:

```tsx
      <DayLog
        date={date}
        entries={data.entries}
        topItems={data.topItems}
        targets={data.targets}
      >
        <WeightField date={date} weight={data.day?.weight ?? null} avg={data.weightAvg} />
      </DayLog>
```

- Remove unused imports (`dayTotals`, `formatKcal`, `formatGrams`, `Remaining`); add `import { DayLog } from "./DayLog";`.

In `src/components/day/DayLog.tsx`, the `children` prop is a plain `React.ReactNode` (not the render-prop shown above — replace `children?: (log: …) => React.ReactNode` with `children?: React.ReactNode`), rendered directly after `<Remaining …/>`:

```tsx
      <Remaining totals={dayTotals(optimistic)} targets={targets} />
      {children}
```

and delete the `{children?.(log, quickAdd)}` line inside the LOG section. `quickAdd` is unused until Task 7; keep it and add `// used by AddFoodSheet in Task 7` above it, or prefix with `void quickAdd;` to satisfy lint — remove that line in Task 7.

- [ ] **Step 5: Typecheck, lint, Playwright check**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

```js
// scratchpad/check-task6.mjs
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://localhost:3000/d/2000-01-06", { waitUntil: "networkidle" });
const first = p.getByRole("button", { name: /Konala chicken burrito bowl/ }).first();
await first.click(); // 1 tap
await p.waitForTimeout(2000);
await p.reload({ waitUntil: "networkidle" });
console.log(await p.getByRole("region", { name: "Logged" }).innerText());
console.log(await p.getByRole("region", { name: "Remaining today" }).innerText()); // 1,349 left · 96g to go
await p.getByRole("button", { name: /^Edit Konala/ }).click();
await p.getByLabel("Calories").fill("700");
await p.getByRole("button", { name: "Done" }).click();
await p.waitForTimeout(2000);
await p.reload({ waitUntil: "networkidle" });
console.log(await p.getByRole("region", { name: "Logged" }).innerText()); // 700 · 54
await p.getByRole("button", { name: /^Remove Konala/ }).click();
await p.waitForTimeout(2000);
await p.reload({ waitUntil: "networkidle" });
console.log(await p.getByRole("region", { name: "Logged" }).count()); // 0
await b.close();
```

Run: `node <scratchpad>/check-task6.mjs`
Expected: the logged row appears; remaining reads `1,349 left · 96g to go`; after edit `700 · 54`; after remove the Logged region is gone (`0`).

Clean up: `npx tsx -e 'import {config} from "dotenv";config({path:".env.local"});const {db}=await import("./src/lib/db");await db.day.deleteMany({where:{date:{startsWith:"2000-"}}});await db.$disconnect()'`

- [ ] **Step 6: Commit**

```bash
git add src/components/day
git commit -m "Add DayLog: one-tap logging with optimistic entries, edit and remove

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: The Add food sheet — quick add, all items, new item, edit/archive

**Files:**
- Create: `src/components/day/AddFoodSheet.tsx`, `src/components/day/ItemForm.tsx`
- Modify: `src/components/day/DayLog.tsx` (render the "All items · Quick add" row and the sheet), `src/components/day/DayScreen.tsx` (pass `items`)

**Interfaces:**
- Consumes: `ItemRow`, `QuickAdd`, `upsertItemAction`, `archiveItemAction`, `ItemView`.
- Produces:
  - `<AddFoodSheet date open onClose items onLog onQuickAdd />`
  - `<ItemForm initial? requireName onSubmit onCancel />` — the shared name/kcal/protein form for Quick add, New item and Edit item. `onSubmit(values: { name: string; calories: number; protein: number; save: boolean })`.

Spec deviation, deliberate: item edit/archive is reached from a ⋯ button on each sheet row, not a long-press. Long-press has no keyboard path and nothing on screen tells you it exists. ⋯ is a 44px target, discoverable, and testable. The tap-to-log row is unchanged.

- [ ] **Step 1: Create `ItemForm`**

Create `src/components/day/ItemForm.tsx`:

```tsx
"use client";

import { useState } from "react";

type Values = { name: string; calories: number; protein: number; save: boolean };

// Two numeric fields first (kcal gets focus), then an optional name and a
// "Save to list" tickbox. Ticking it, or `requireName`, makes the name
// required. The submit button disables while pending so a double-tap can't
// log twice.
export function ItemForm({
  initial,
  requireName = false,
  showSave = true,
  submitLabel,
  pending = false,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Values>;
  requireName?: boolean;
  showSave?: boolean;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (v: Values) => void;
  onCancel?: () => void;
}) {
  const [cal, setCal] = useState(initial?.calories == null ? "" : String(initial.calories));
  const [prot, setProt] = useState(initial?.protein == null ? "" : String(initial.protein));
  const [name, setName] = useState(initial?.name ?? "");
  const [save, setSave] = useState(initial?.save ?? requireName);
  const [errors, setErrors] = useState<{ cal?: boolean; prot?: boolean; name?: boolean }>({});

  const submit = () => {
    const c = Number(cal);
    const p = Number(prot);
    const needName = requireName || save;
    const e = {
      cal: !(cal.trim() !== "" && Number.isInteger(c) && c >= 0 && c <= 5000),
      prot: !(prot.trim() !== "" && Number.isInteger(p) && p >= 0 && p <= 500),
      name: needName && name.trim() === "",
    };
    setErrors(e);
    if (e.cal || e.prot || e.name) return;
    onSubmit({ name: name.trim(), calories: c, protein: p, save: needName });
  };

  const field = (
    value: string,
    set: (v: string) => void,
    label: string,
    bad: boolean | undefined,
    mode: "numeric" | "text",
    autoFocus = false,
  ) => (
    <input
      type="text"
      inputMode={mode}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => set(e.target.value)}
      placeholder={label}
      aria-label={label}
      aria-invalid={bad || undefined}
      className={`min-h-11 min-w-0 flex-1 rounded-card border bg-bg-alt px-3 font-mono text-ink placeholder:text-ink-faint ${
        bad ? "border-rust" : "border-line"
      }`}
    />
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        {field(cal, setCal, "kcal", errors.cal, "numeric", true)}
        {field(prot, setProt, "g protein", errors.prot, "numeric")}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-card border border-moss px-4 font-mono text-sm tracking-wider text-moss uppercase disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
      <div className="flex items-center gap-2">
        {field(name, setName, requireName ? "Name" : "Name (optional)", errors.name, "text")}
        {showSave && !requireName && (
          <label className="flex min-h-11 items-center gap-2 font-mono text-xs tracking-wider text-ink-dim uppercase">
            <input
              type="checkbox"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
              className="size-5 accent-moss"
            />
            Save to list
          </label>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-card px-3 font-mono text-xs tracking-wider text-ink-dim uppercase"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `AddFoodSheet`**

Create `src/components/day/AddFoodSheet.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { archiveItemAction, upsertItemAction } from "@/app/actions";
import type { ItemView } from "@/lib/day-screen";
import type { QuickAdd } from "./DayLog";
import { ItemForm } from "./ItemForm";
import { ItemRow } from "./ItemRow";
import { SaveError } from "./SaveError";

// Bottom sheet over Today. Quick add first (it's why you opened it), then
// every item by use, then New item. Logging does not close it. A filter box
// appears only past 20 items (docs/07-food-log.md).
export function AddFoodSheet({
  date,
  open,
  onClose,
  items,
  onLog,
  onQuickAdd,
}: {
  date: string;
  open: boolean;
  onClose: () => void;
  items: ItemView[];
  onLog: (item: ItemView) => void;
  onQuickAdd: QuickAdd;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<ItemView | "new" | null>(null);
  const [quickKey, setQuickKey] = useState(0);
  const [quickPending, setQuickPending] = useState(false);
  const [failed, setFailed] = useState<(() => void) | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const shown = items.filter((i) => i.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const saveItem = (values: { name: string; calories: number; protein: number }, id?: string) => {
    const attempt = () =>
      startTransition(async () => {
        setFailed(null);
        try {
          await upsertItemAction(date, { id, ...values });
          setEditing(null);
        } catch {
          setFailed(() => attempt);
        }
      });
    attempt();
  };

  const archive = (id: string) => {
    const attempt = () =>
      startTransition(async () => {
        setFailed(null);
        try {
          await archiveItemAction(date, id);
          setEditing(null);
        } catch {
          setFailed(() => attempt);
        }
      });
    attempt();
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose(); // scrim tap
      }}
      aria-label="Add food"
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-card border-t border-line bg-bg p-0 text-ink backdrop:bg-black/60 sm:mb-6 sm:rounded-card sm:border"
    >
      <div className="px-4 pt-4 pb-6">
        <section aria-label="Quick add">
          <p className="label mb-2">Quick add</p>
          <ItemForm
            key={quickKey}
            submitLabel="Log"
            pending={quickPending}
            onSubmit={(v) => {
              setQuickPending(true);
              onQuickAdd({
                calories: v.calories,
                protein: v.protein,
                name: v.name || undefined,
                save: v.save,
              });
              // Reset the form for the next one-off; the entry shows in LOGGED behind the sheet.
              setQuickKey((k) => k + 1);
              setQuickPending(false);
            }}
          />
        </section>

        <section className="mt-6" aria-label="Items">
          <div className="mb-2 flex items-center justify-between">
            <p className="label">Items</p>
            {items.length > 20 && (
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter"
                aria-label="Filter items"
                className="min-h-11 w-32 rounded-card border border-line bg-bg-alt px-3 font-mono text-sm text-ink"
              />
            )}
          </div>
          <ul className="space-y-1.5">
            {shown.map((item) =>
              editing !== "new" && editing?.id === item.id ? (
                <li key={item.id} className="rounded-card border-l-2 border-l-rust bg-surface p-3">
                  <ItemForm
                    initial={item}
                    requireName
                    showSave={false}
                    submitLabel="Save"
                    onSubmit={(v) => saveItem(v, item.id)}
                    onCancel={() => setEditing(null)}
                  />
                  <button
                    type="button"
                    onClick={() => archive(item.id)}
                    className="mt-2 min-h-11 font-mono text-xs tracking-wider text-danger uppercase"
                  >
                    Archive item
                  </button>
                </li>
              ) : (
                <ItemRow
                  key={item.id}
                  item={item}
                  onLog={onLog}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      aria-label={`Edit item ${item.name}`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-card font-mono text-ink-faint"
                    >
                      ⋯
                    </button>
                  }
                />
              ),
            )}
          </ul>
          {failed && <SaveError onRetry={failed} />}
        </section>

        <section className="mt-6" aria-label="New item">
          {editing === "new" ? (
            <ItemForm
              requireName
              showSave={false}
              submitLabel="Save"
              onSubmit={(v) => saveItem(v)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="flex min-h-11 w-full items-center rounded-card border border-dashed border-line px-3 text-left font-mono text-sm text-ink-dim"
            >
              + New item
            </button>
          )}
        </section>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-card border border-line font-mono text-sm tracking-wider text-ink-dim uppercase"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
```

Note: "New item" saves the item but the spec says it also logs it. Handle that in `DayLog` (next step) by passing an `onSaved` that logs — simpler: after `upsertItemAction` resolves, call `onLog` with the new item. `upsertItem` returns `{ id }` in `src/lib/log.ts` but the action returns `void`; change `upsertItemAction` to return `Promise<{ id: string }>` (edit `src/app/actions.ts`: `const item = await log.upsertItem(...); revalidateDay(d); return item;`). Then in `saveItem`, when `id` is undefined: `const { id: newId } = await upsertItemAction(date, values); onLog({ id: newId, ...values });`.

- [ ] **Step 3: Render the sheet from `DayLog`**

In `src/components/day/DayLog.tsx`:

- Add props `items: ItemView[]`.
- Add state `const [sheetOpen, setSheetOpen] = useState(false);`.
- Keep the `children` prop (it's the weight field). Remove any `void quickAdd;` placeholder. After the `topItems` `<ul>`, add:

```tsx
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mt-1.5 flex min-h-11 w-full items-center rounded-card border-l-2 border-l-line bg-bg-alt px-3 text-left font-mono text-sm tracking-wider text-ink-dim uppercase"
        >
          All items · Quick add
        </button>
        <AddFoodSheet
          date={date}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          items={items}
          onLog={log}
          onQuickAdd={quickAdd}
        />
```

- Import `AddFoodSheet`.

In `src/components/day/DayScreen.tsx`, pass `items={data.items}` to `<DayLog>`.

- [ ] **Step 4: Typecheck, lint, Playwright check of the sheet paths**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

```js
// scratchpad/check-task7.mjs
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://localhost:3000/d/2000-01-07", { waitUntil: "networkidle" });
await p.getByRole("button", { name: "All items · Quick add" }).click(); // tap 1
await p.getByRole("dialog", { name: "Add food" }).getByRole("button", { name: /Cheddar slice/ }).click(); // tap 2
await p.waitForTimeout(1500);
// Quick add: 800 kcal, 0 g, no name
await p.getByLabel("kcal").fill("800");
await p.getByLabel("g protein").fill("0");
await p.getByRole("button", { name: "Log", exact: true }).click(); // double-click guard
await p.getByRole("button", { name: "Log", exact: true }).click();
await p.waitForTimeout(2000);
await p.getByRole("button", { name: "Close" }).click();
await p.reload({ waitUntil: "networkidle" });
console.log(await p.getByRole("region", { name: "Logged" }).innerText());
await b.close();
```

Run: `node <scratchpad>/check-task7.mjs`
Expected: Logged shows `Cheddar slice 90 · 5` and exactly one `Quick add 800 · 0`. The second Log click lands on a reset (empty) form and fails client validation, so no duplicate — if two `800 · 0` rows appear, the double-submit guard is broken; fix before continuing.

Clean up: `npx tsx -e 'import {config} from "dotenv";config({path:".env.local"});const {db}=await import("./src/lib/db");await db.day.deleteMany({where:{date:{startsWith:"2000-"}}});await db.$disconnect()'`

- [ ] **Step 5: Check the sheet's edit path leaves history alone**

Log a Cheddar slice on `/d/2000-01-08` via the UI, then edit the item to 95 kcal through ⋯, then reload. Expect: the LOGGED row still says `90 · 5`; the LOG row says `95 · 5`. Set it back to 90 through ⋯ and clean the test day as above.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions.ts src/components/day
git commit -m "Add the Add food sheet: quick add, all items, new item, edit and archive

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Visual pass at 390 and 1280, docs, final checks

**Files:**
- Modify: `src/components/day/*.tsx` as the review requires; `CLAUDE.md` (repo layout); `docs/02-roadmap.md` (tick Phase 2 items delivered)

- [ ] **Step 1: Put realistic data on today**

Through the UI on `/`: log Konala chicken burrito bowl, Core Power Elite chocolate, Fairlife chocolate milk; set weight 178.2; tick Trained; notes "Legs felt heavy, cut the run". Leave this — it's real use starting today. Also set a weight on `/d/2026-09-20` (179.0) and `/d/2026-09-19` (178.8) so the average has a window.

- [ ] **Step 2: Screenshots**

Run: `node scripts/shot.mjs / today && node scripts/shot.mjs /d/2026-09-22 empty`

For the sheet, run from the scratchpad:

```js
import { chromium } from "playwright";
const b = await chromium.launch();
for (const [label, width] of [["desktop", 1280], ["mobile", 390]]) {
  const p = await b.newPage({ viewport: { width, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "All items · Quick add" }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `.shots/sheet-${label}.png`, fullPage: false });
  await p.close();
}
await b.close();
```

- [ ] **Step 3: Run `/verify-ui` on `/`**

Invoke the `verify-ui` skill with route `/` and name `today`. It reads the screenshots, dispatches the `ui-reviewer` subagent, and loops on findings (max four iterations). Include `.shots/empty-*.png` and `.shots/sheet-*.png` in the reviewer's prompt with the note that the spec is `docs/superpowers/specs/2026-09-21-today-and-food-log-design.md`. Fix findings worst-first; don't fix ones you disagree with — say why.

- [ ] **Step 4: Keyboard and reduced-motion check**

In the browser: Tab through Today. Every control (‹, date, ›, Trained, weight, each LOGGED row and its ✕, each LOG row, All items, notes) must show the 2px rust focus ring. In the sheet, Escape closes it. With `prefers-reduced-motion` emulated (`page.emulateMedia({ reducedMotion: "reduce" })` in Playwright), the flash on tap is instant, not animated — `globals.css` already sets `transition: none`.

- [ ] **Step 5: Update docs**

In `CLAUDE.md`, under Repo layout, change the `src/app/` and `src/lib/` lines to:

```
src/app/       Routes. `/` is Today; `/d/YYYY-MM-DD` any date; `/block` the
               day list. `actions.ts` holds every server action.
src/components/day/  The Today screen: DayScreen (server) and the client
               pieces — DateNav, TrainedToggle, WeightField, NotesField,
               DayLog, AddFoodSheet.
src/lib/       dates, schedule, days (ensureDay), day-screen (read model),
               log (every write), validate (Zod), items, weight, totals,
               format, db.
```

In `docs/02-roadmap.md`, Phase 2: leave the bullets, add under them:

```
> Today screen and food log shipped 2026-09-xx per
> `docs/superpowers/specs/2026-09-21-today-and-food-log-design.md`.
> Remaining for Phase 2: block view editable inline, PIN lock.
```

(fill in the date).

- [ ] **Step 6: Full check**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: all pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Today screen visual pass; document routes and components

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Do not push. Phase 2's done bar is three real days logged from the phone; pushing to `main` deploys to Vercel, which is what makes that possible — ask before pushing.
