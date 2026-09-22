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

### 1. Today screen + food log — built

Eight plan tasks, each TDD'd and committed separately (`5bb65fa`..HEAD on
`autobuild`). 67 unit/DB tests pass; typecheck, lint and `npm run build`
clean.

- `/` is Today, `/d/YYYY-MM-DD` any date (impossible dates 404), `/block`
  the old list. Every write is a server action → `src/lib/log.ts`, which
  calls `ensureDay` first, so logging on any date creates its Day row.
- **Tap count for a repeat meal, from the home-screen icon (tap zero):
  1 tap** if it's in the six most-used items shown inline on Today;
  **2 taps** otherwise (open sheet, tap item). Verified with Playwright:
  one click on the "Konala chicken burrito bowl" row created the Entry,
  and it survived a reload.
- Day totals are computed from entries on read (`dayTotals`), never
  stored; the schema has no calories/protein columns on Day.
- Weight, trained and notes persist (Playwright: `178,26` → `178.3`
  after reload; Trained `aria-pressed=true` after reload).
- Entries copy the item's name and numbers; editing an item afterwards
  left the logged entry at 90 kcal while the item showed 95 (checked).

**Verifiers.** `/verify-ui /` took two rounds: round one found the rust
"today" rule stopping under the session name, the unset weight not
emphasised, and a textarea resize grip; all fixed (the rule fix also
needed a margin-collapse fix). Round two confirmed them and left one
polish note (the big em dash read as a gap) — replaced with a dashed
blank. Keyboard pass: every real control shows the rust focus ring;
Escape closes the sheet; reduced motion respected.

**Decisions the docs didn't cover.** Item edit/archive is a ⋯ button, not
a long-press (see SUGGESTIONS.md). Item names wrap to two lines instead
of truncating. `routeFor` lives in `src/lib/routes.ts` so client
components don't import the Prisma client. `removeEntry` keeps the Day
row.

**Data note.** Today (2026-09-21) now holds three real entries, weight
178.2, trained, and a note; 09-19 and 09-20 have weights — entered
through the UI as the first real use. Test rows used dates in January
2000 and were deleted.
