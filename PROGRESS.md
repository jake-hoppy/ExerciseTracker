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

**Phase 2 status: built, verified, committed on `autobuild`. Not pushed,
not deployed.** Remaining is the human part: deploy, then three real days
on the phone. Phase 3 not started — this run was scoped to Phase 2.

## Phase 3 — plan

Branch `phase-3` off `main` (`53e8b5b`). Deploy skipped on instruction.

Scope from `docs/02-roadmap.md`: weight chart (raw dailies, 7-day rolling
average, start and goal lines); calories and protein per day against
target; streaks, completion counts, block summary; a stats module unit
tested against every rule in `docs/04-domain-rules.md`. Done when "is this
block working?" needs no arithmetic.

1. **Stats module** `src/lib/stats.ts`, pure functions over one row per
   calendar date `{ date, logged, calories, protein, weight, trained,
   isRest }`, test-first with hand-checked values:
   - `currentStreak(rows, today)` — R2: walk back from today; an unlogged
     today is skipped, never counted against.
   - `longestStreak(rows)` — R3: whole range, independent of today.
   - `rollingAverageSeries(rows, window=7)` — R4 via the existing
     `trailingAverage`, per date; a test proving a 7-calendar-day window
     differs from a 7-entry window when days are missing.
   - `mean(values)` — R6: nulls excluded, never counted as zero.
   - `completion(rows)` — R5: training/rest/logged/trained counts derived
     from the rows' sessions, never hardcoded.
   - `weightDelta(series, start)` — R4: the headline delta comes from the
     average, states its window when short; anchors at `startWeight` when
     day 1 has no reading.
2. **Demo data** `npm run seed:demo` / `npm run seed:clear`
   (`prisma/demo.ts`). Demo fills only days that are empty (no entries,
   no weight, no notes, not trained) in the 28 days before today, writes
   a manifest to `.demo/manifest.json` (gitignored) listing exactly what
   it touched, sets each demo day's notes to "Demo data — npm run
   seed:clear", and links no FoodItem so usage counts stay real.
   `seed:clear` reverses precisely the manifest. Real data is never
   read, written or reordered by either.
3. **Trends screen** `/trends`: range = the block covering today, else the
   last 30 days through today. Tiles: current streak, longest streak,
   logged N of M days, trained N of T training days, average weight delta.
   Charts as inline SVG per `docs/03-design-system.md` (mono axis text
   sized against the viewBox, gutters widened at 390): weight (thin raw
   line + dots, thick average line, start/goal lines), calories per day
   with the target line, protein per day with the target line. Load the
   `dataviz` skill before drawing.
4. **Verify**: `/verify-ui /trends` with demo data (cap 4);
   `rules-auditor` on the stats module (cap 3); exit criteria from
   `docs/08` Phase 3 recorded below; `seed:clear` run and the database
   checked for zero demo rows before finishing.

## Phase 3 — log

### Stats module — built

`src/lib/stats.ts`: `currentStreak` (R2), `longestStreak` (R3), `mean`
(R6), `rollingAverageSeries` (R4 over `trailingAverage`), `completion`
(R5), `weightDelta` (R4 headline). 23 tests with hand-checked values,
including: today unlogged doesn't break the streak; a missing date is a
miss; rest days count like any day (R1); the 7-calendar-day window
differs from a 7-entry window when days are missing (the last seven
readings spanning three weeks average 180.7, the calendar window's five
average 179.38); a null weight/calorie day is excluded, not zero; the
delta anchors at `startWeight` only when day 1 has no average.

One decision the rules don't cover: with no block (so no `startWeight`)
and a range that opens before the first weigh-in, the delta's origin is
the first day that has an average. Without that the "Last 30 days" view
could never show a delta.

### Demo data — built

`npm run seed:demo` fills empty days in the 28 before today (never today)
with a downward weight trend plus daily noise, 3–5 meals copied by value
(no `itemId`, so usage counts stay real), "trained" following the real
schedule, and the note "Demo data — npm run seed:clear" on every demo
day. It refuses to run if a manifest already exists. `npm run seed:clear`
reverses exactly `.demo/manifest.json` (gitignored): rows it created are
deleted, rows it filled are emptied. Ran demo → clear → demo during the
build; the two real days in the window (09-20 trained, 09-21 everything)
were skipped each time.

Note: 09-19 had a real weigh-in earlier in the day, but by the time demo
ran it was empty (someone cleared it while trying the app), so demo
filled it and `seed:clear` will return it to empty, not to 178.8.

### Trends screen — built

`/trends`: range is the block covering today, else the last 30 days.
Summary tiles lead with the weight change on the rolling average and its
window ("−3.0 lb on the 6-day average"), then streaks, logged N of M,
trained sessions against scheduled, average calories/protein against
target. Three inline-SVG charts, each drawn twice (phone/desktop
layouts) so axis text is legible at 390px per the design system's SVG
rule: weight (thin ink line + dots, thick moss average, start/goal
hairlines when a block sets them), calories and protein columns against
the rust target line. Unlogged days are gaps. The chart colour trio
(moss, ink, rust) was run through the dataviz validator for
colour-vision separation; ink replaced ink-faint for the raw series
because the grey failed the normal-vision floor against moss.

Not built: hover tooltips/crosshair (the dataviz default). Marks carry
native `<title>`s and `/block` is the table view. Noted in SUGGESTIONS.md.

Linked from Today's footer and the block view header.

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

### 2. PIN lock — built

`src/proxy.ts` (Next 16's name for middleware), `src/app/api/unlock/route.ts`,
`src/app/unlock/page.tsx` + `PinForm`, with the constant-time compare and
attempt limiter in `src/lib/pin.ts` under 5 unit tests (lockout at the
fifth failure, countdown, reopen, per-key isolation).

Checked with Playwright against the dev server: no cookie → `/` redirects
to `/unlock?from=%2F…`; the right PIN sets an `httpOnly` cookie that does
not contain the PIN and lands on the requested date; five wrong PINs each
say "Incorrect PIN." and the sixth attempt, even with the right PIN, gets
"Too many attempts. Try again in 60s." `git grep` for the literal values
of `APP_PIN` and `SESSION_SECRET` finds nothing tracked (the names appear
only as `process.env.*` and in docs). `scripts/shot.mjs` now sends the
session cookie so `/verify-ui` renders behind the gate; `--locked` skips it.

`/verify-ui /unlock`: one round, passed; polish notes only (app name — added;
a length hint in the field — not added, see SUGGESTIONS.md).

### 3. Block view — built

`/block` lists every date from the first Day through today (`spanRows`,
tested: gaps become unlogged rows, R1c), grouped by month newest first
(`groupByMonth`, tested). Weight and trained edit inline via the Today
components in a compact mode; the date links to `/d/<date>`. Playwright:
editing Sep 18's weight and trained from the list survived a reload; the
link went to `/d/2026-09-18`; the test edits were reverted.

First 390px render had the session column squeezed to zero by fixed
columns and a full-width Trained stamp per row — fixed with a tighter
grid and a 44px tick-only toggle. `/verify-ui /block`: one round, passed;
polish only (empty tick box has no interior mark; rest-day rule subtle;
today had no marker — added the rust rule on today's row).

### 4. Reviews and fixes

**Whole-branch code review** (fresh reviewer, most capable model) of the
Today work: 0 Critical, 3 Important, 12 Minor. Fixed in one pass, each
reproduced first then re-checked (`49a1eb6`):
- The double-submit guard existed but wasn't wired: a double-tap on New
  item created two items. Now `pending` disables every sheet form's
  submit while the action runs.
- Weight bounds were only checked server-side, so `1782` produced an
  un-clearable "tap to retry". Now out-of-range never submits (rust
  outline), and a blur with no change no longer writes — that write was
  creating empty Day rows on any date you glanced at, which `/block`
  then listed forever.
- `crypto.randomUUID` for optimistic ids needs a secure context; over
  plain-http LAN (a phone hitting the dev server) it's undefined and
  logging broke silently. Replaced with a plain id generator.
- A page left open across midnight would log to yesterday. `TodayGuard`
  on `/` refreshes when the tab returns on a later calendar date, once
  per client date so a clock disagreement can't loop.
Deferred minors are listed in the final hand-back and in SUGGESTIONS.md
where they need a decision (archive has no undo; duplicate item names
allowed; retry after a lost-response delete fails; sheet state survives
close; ensureDay race under simultaneous first writes; textarea has no
maxLength; EntryRow shares one invalid flag; a few cosmetic ones).

**Rules audit** (`rules-auditor`, twice). Round one: R4, R6, R6b, R6c, R7,
R1b/R1c all PASS on the math and the date flow, with one FAIL — the
weight line led with the raw reading, not the average (R4). `docs/10`
had drawn it that way. Fixed (`e24595b`) and the doc corrected. The audit
also caught a test that couldn't fail (overlapping-block protein 150 ==
settings 150) — re-pinned with 175. Round two: PASS on all three items
(average leads with its window stated; the raw reading alone when there is
no window; the overlap test can now actually fail). The auditor agreed the
block table's per-day raw column is the raw series, not a headline, so R4
doesn't apply there.

### Phase 2 exit criteria (`docs/08-autonomous-run.md`)

- [x] Today screen renders the current day — and any date, with or
      without a Day row (the "outside every block" state no longer exists;
      see SUGGESTIONS.md).
- [x] Adding a saved item writes an Entry that survives reload — Playwright,
      Task 6 check.
- [x] Repeat meal in ≤ 3 taps from Today — **1 tap** (top six inline),
      **2 taps** via the sheet. Counted above.
- [x] Day totals sum from entries, never stored — `prisma/schema.prisma`
      Day has no calories/protein columns; audit confirmed.
- [x] Weight and trained persist — Playwright, Task 5 and block checks.
- [x] `/verify-ui /` passes at 1280 and 390 — two rounds, stopped on a
      polish finding. `/unlock` and `/block` one round each.
- [x] No touch target under 44px — both reviewers checked every control.
- [x] PIN gate: unauthenticated `/` → `/unlock`; right PIN sets the cookie;
      five wrong lock out — Playwright.
- [x] `APP_PIN` / `SESSION_SECRET` values in no tracked file — `git grep`
      for both literal values: 0 hits. The names appear only as
      `process.env.*` and in docs.
- [x] `npm test` 82 passed; `npm run typecheck`, `npm run lint`,
      `npm run build` clean.
- [ ] Deployed to Vercel — skipped on instruction. Nothing pushed.
- [ ] Three consecutive real days logged from the phone — needs you.
