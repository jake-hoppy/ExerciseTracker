# Progress

Unattended run, started 2026-09-21, branch `autobuild`. Protocol:
`docs/08-autonomous-run.md`. Vercel deploy skipped on instruction; nothing
here is pushed.

## Phase 1 — done before this run

Built and committed on `main` earlier on 2026-09-21, then migrated to the
revised D4 schema (days stand alone, Settings singleton, blocks as labels).
Exit criteria checked then: build, migrate, seed (30 days + 14 food items),
typecheck, lint all clean. The Phase 1 criterion "30 days, 22 non-rest" holds
against the seeded days.

## Phase 2 — plan

Scope from `docs/02-roadmap.md`, in this order:

1. **Today screen + food log.** Spec
   `docs/superpowers/specs/2026-09-21-today-and-food-log-design.md`; plan
   `docs/superpowers/plans/2026-09-21-today-and-food-log.md` (8 tasks);
   visual direction `docs/10-today-design.md`. `/` becomes Today,
   `/d/YYYY-MM-DD` any date, the existing day list moves to `/block`.
2. **PIN lock** per `docs/06-pin-lock.md`: `middleware.ts`,
   `/api/unlock`, `/unlock`. `APP_PIN` and `SESSION_SECRET` are already in
   `.env.local`.
3. **Block view, editable inline.** `/block` lists every date from the first
   Day through today; weight, trained and notes editable in place, reusing
   the Today components. Entries are edited on the day's page, linked from
   each row.
4. **Exit criteria** from `docs/08-autonomous-run.md` Phase 2, each checked
   by a command or a screenshot review, recorded below.

Verification: unit tests for every piece of arithmetic (hand-checked values),
database tests for every write, `/verify-ui` on `/`, `/unlock` and `/block`
(cap 4 rounds each), `rules-auditor` on the trailing-average code.

## Phase 2 — log

(appended as work lands)
