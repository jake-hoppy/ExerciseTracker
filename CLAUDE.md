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

Next.js (App Router, TypeScript) + Tailwind. Postgres on Neon via Prisma.
Deployed on Vercel from `main`. No auth in Phase 1; password middleware in
Phase 2.

Reasoning lives in `docs/01-architecture-decisions.md`, not here.

## Commands

Fill these in as the project scaffolds. This is the most load-bearing section
in the file — keep it accurate.

```
# install
# dev server
# typecheck
# lint
# test
# db migrate
# db seed
```

## Repo layout

```
docs/        Decisions, roadmap, domain rules, design system. Read before building.
data/        Seed data — the completed 30-day block.
.claude/     Subagent and command definitions.
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
