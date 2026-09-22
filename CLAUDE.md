# CLAUDE.md

Guidance for Claude Code working in this repo.

> **Status:** D1, D3, D4, D4b and D7 are settled. D2 (relationship to the
> existing website) and D5 (lift logging) are still open and don't block
> Phase 1. See `docs/01-architecture-decisions.md`.

## What this is

A personal training and nutrition tracker for one user. Logs daily workouts,
calories, protein and bodyweight across fixed-length training blocks, and
shows whether the block is actually working.

It replaces a single-file HTML prototype. The prototype's behaviour is the
spec for anything carried over — see `docs/04-domain-rules.md`, which is
binding, not suggestive.

## Stack

Next.js 16 (App Router, TypeScript) + Tailwind 4. Postgres on Neon via
Prisma 7 with the Neon driver adapter. Vitest for tests.
Deployed on Vercel from `main`. No auth in Phase 1; password middleware in
Phase 2.

Reasoning lives in `docs/01-architecture-decisions.md`, not here.

## Commands

This is the most load-bearing section in the file — keep it accurate.

```
npm install              # also runs prisma generate (postinstall)
npm run dev              # http://localhost:3000
npm run typecheck        # next typegen && tsc --noEmit
npm run lint             # eslint
npm test                 # vitest run
npm run build            # prisma generate && next build
npm run db:migrate       # prisma migrate dev — create + apply a migration
npm run db:deploy        # prisma migrate deploy — apply only (CI / Vercel)
npm run db:seed          # load data/seed-block.json; safe to re-run
npm run db:studio        # browse the database
node scripts/shot.mjs / name   # screenshots to .shots/ at 1280 + 390 (dev server running)
```

Env lives in `.env.local` (gitignored). `DATABASE_URL` is Neon's **pooled**
Postgres string, used by the app. `DATABASE_URL_UNPOOLED` is the direct one,
used by Prisma migrations (`prisma.config.ts`). `NEON_DATA_API_URL` is the
Data API REST endpoint and nothing uses it yet.

Prisma is pinned to 7.10.0 — npm's `latest` tag points at an 8.0 RC. The
generated client is in `src/generated/prisma` (gitignored); import it
from `@/generated/prisma/client`, and use `db` from `@/lib/db` in app code.

## Repo layout

```
docs/          Decisions, roadmap, domain rules, design system. Read before building.
data/          Seed data — the completed 30-day block.
prisma/        Schema, migrations, seed script.
src/app/       Routes. `/` is Today; `/d/YYYY-MM-DD` any date; `/block` the
               day list. `actions.ts` holds every server action.
src/components/day/  The Today screen: DayScreen (server) and the client
               pieces — DateNav, TrainedToggle, WeightField, NotesField,
               DayLog (entries + inline items), AddFoodSheet.
src/lib/       dates, routes (client-safe), schedule, days (ensureDay),
               day-screen (read model), log (every write), validate (Zod),
               items, weight, totals, format, db.
scripts/       shot.mjs for /verify-ui.
.claude/       Subagent and command definitions.
```

## How to work here

**Read `docs/04-domain-rules.md` before touching anything that computes a
streak, an average, or a completion count.** Those rules came out of a month
of real use and several of them are counterintuitive. Changing one is a
product decision, not a refactor.

**Work in phases.** `docs/02-roadmap.md` defines them. Finish a phase and stop
for review rather than running ahead — a half-built Phase 3 blocks Phase 2
from being usable. (`docs/08-autonomous-run.md` is the exception, for
unattended runs.)

**Any date is loggable.** Days are created when something is logged on them;
the workout is computed from `Settings`, not pre-generated. Blocks are optional
labels over date ranges. Never gate logging on a block existing.

**A field nobody fills is worse than no field.** Several were cut for this
reason — waist, resting HR, the food-logged and protein-hit checkboxes. Don't
add one back without the user saying they'll use it.

**Verify UI work by looking at it.** Run `/verify-ui` after any visual change.
Screenshot, compare against `docs/03-design-system.md`, fix, repeat until it
holds up. Don't report a screen as done without having seen it rendered,
including at 390px wide.

**Verify math by running it.** Streaks, rolling averages and completion counts
get unit tests with hand-checked expected values. A number that looks right on
screen is not evidence.

**Prefer editing over adding.** This is a small personal app. A new abstraction
needs to pay for itself immediately.

## Conventions

- Dates are calendar dates, not timestamps. Store and compare as `YYYY-MM-DD`
  strings or date-only columns. Timezone bugs in a daily tracker are the single
  most likely source of silent wrongness — a weigh-in must not land on the
  wrong day because of UTC.
- Weight is pounds, calories kcal, protein grams. No unit abstraction in v1.
- All user-visible numbers go through one formatting module. No inline
  `toFixed` scattered across components.
- Empty is `null`, not `0` and not `""`. A day with no logged calories is not
  a zero-calorie day, and it must not drag an average down.

## Non-goals for v1

No auth, no multi-user, no social features, no wearable sync, no meal
database. Each of these is a project. See `docs/05-research-brief.md` for the
ones worth investigating later.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
