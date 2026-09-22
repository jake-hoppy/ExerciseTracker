# Today screen and food log — design

Phase 2's core: the screen the app opens on, and the flow that logs a repeat
meal in three taps or fewer. Approved in brainstorm on 2026-09-21.

Binding inputs: `docs/04-domain-rules.md`, `docs/07-food-log.md`,
`docs/09-design-brief.md`, `docs/03-design-system.md`.

## Scope

**In:** the Today screen for any date, the add-food sheet, weight, trained,
notes, entry editing, saved-item editing and archiving, server actions and
optimistic updates.

**Out:** Block view, Trends, PIN lock, offline queue (Phase 5), lifts, any
metric beyond food and weight, settings beyond block targets. The existing
day list on `/` moves to `/block` unchanged; the block-view task reshapes it.

## Routes

- `/` renders today (`today()` in Mountain time). It never redirects; the
  home-screen icon always lands on a page to write on.
- `/d/YYYY-MM-DD` renders any other date with the same component. Invalid
  dates 404.
- Both render `DayScreen({ date })`, a server component.

Header navigation: `‹` and `›` link to the adjacent dates. The date itself is
a native `<input type="date">` styled as text; changing it navigates. No
picker library.

## Today screen

Order, top to bottom, at 390px:

1. **Header** — `‹ MON SEP 21 · TODAY ›`. "TODAY" only on today's date. The
   covering block's name follows the date if one exists; otherwise nothing.
2. **Session and trained** — the computed session name (`workoutTypeIdFor`,
   with the day's override) in Oswald, and a single ≥44px toggle button
   labelled "Trained", moss when on. Not a checkbox beside text.
3. **Remaining** — `1,109 left · 24g to go` in parchment numerals, then
   `991 / 2,100 kcal   126 / 150 g` in mono ink-dim. Remaining leads; totals
   report. Over target reads `120 over` in `--danger`; nothing else changes.
   No target (rule R6b resolution yields null) shows totals only.
4. **Weight** — `WEIGHT 178.2 · 7-day 178.9`. Tapping the number swaps in a
   `inputmode="decimal"` field pre-filled with the current value; blur or
   Enter saves; empty saves null. The 7-day figure is the trailing average
   over the last 7 calendar days' readings (rule R4), shown beside the raw
   reading because the average always leads.
5. **LOGGED** — the day's entries, newest last: name, kcal, protein, `✕`.
   Absent entirely when there are no entries; no empty-state copy.
6. **LOG** — the six most-used active items, ordered `timesUsed desc,
   lastUsed desc`, each a ≥44px row that logs on one tap. Items already
   logged today remain listed. A final row, "All items · Quick add", opens
   the sheet.
7. **NOTES** — one text field, saves on blur.

Empty renders as `—`, never 0. Past and future dates render identically to
today, minus the "TODAY" tag.

## Add-food sheet

A bottom sheet over Today, sized to content, scrollable inside, dismissed by
the scrim or a Close row. Logging from it does not close it.

Order:

1. **QUICK ADD** — kcal and protein fields (`inputmode="numeric"`, kcal
   focused on open), a Log button, an optional name, and a "Save to list"
   tickbox. Ticking it makes the name required and creates a `FoodItem`
   before the entry.
2. **ITEMS** — every active item, `timesUsed desc, lastUsed desc`. A filter
   box appears only once there are more than 20 items. Long-press an item
   for edit (name, kcal, protein) and archive; that never touches entries.
3. **+ New item** — the quick-add form with the name required; saves the item
   and logs it.
4. **Close.**

A tapped row flashes moss for 150ms. No toast. Undo is the entry's `✕`.

### Tap counts, from the home-screen icon (tap zero)

| Case | Taps |
|---|---|
| Repeat meal in the top six | 1 |
| Repeat meal not in the top six | 2 (open sheet, tap item) |
| Repeat meal plus a shake | 2 inline, 3 via the sheet |
| One-off | 3 plus typing (open sheet, Log after two fields) |

## Entry editing

Tapping a LOGGED row expands it in place to kcal and protein fields and a
Done button. It changes that entry only. Entries copy numbers from items and
never reference them for display, so editing an item never rewrites history.

## Multiples

Three eggs are three taps and three rows, each removable. No quantity field,
no grouping.

## Data flow

**Read.** `DayScreen` loads in one pass: `Settings`, all `WorkoutType`s, all
`Block`s, the `Day` for the date with entries (may be null), the last seven
calendar days' weights, and active `FoodItem`s in log order. Session and
targets resolve through `workoutTypeIdFor` and `targetsFor` in
`src/lib/schedule.ts`. A missing `Day` renders exactly like an empty one.

**Write.** Server actions in `src/app/actions.ts`. Every day-scoped action
calls `ensureDay(date)` first (rule R1b): the row appears on first write, on
any date.

| Action | Effect |
|---|---|
| `logItem(date, itemId)` | Entry copying the item's numbers; `timesUsed += 1`, `lastUsed = now` |
| `quickAdd(date, { calories, protein, name?, save })` | Entry with `itemId` null; with `save`, creates the item first and links it |
| `updateEntry(entryId, { calories, protein })` | That entry only |
| `removeEntry(entryId)` | Deletes the entry; the Day row stays |
| `setWeight(date, lbs \| null)` | Day field |
| `setTrained(date, bool)` | Day field |
| `saveNotes(date, text)` | Day field; empty saves null |
| `upsertItem({ id?, name, calories, protein })` | Item list only |
| `archiveItem(id)` | Sets `archived`; entries untouched |

**Validation**, with Zod, in the action: date is a real calendar date
(`isDateString`); calories integer 0–5000; protein integer 0–500; weight
50–500 with one decimal; name ≤ 80 characters. Each action ends with
`revalidatePath` for the day's route.

**Optimistic UI.** Entries, weight and trained are wrapped in `useOptimistic`
so a tap shows immediately and the server render replaces it.

## Errors

A failed action (timeout, validation) reverts the optimistic state and shows
an inline "Didn't save — tap to retry" in `--danger` on the affected row.
No modal, no toast. Client-side invalid numbers never submit; the field gets
the 2px rust outline.

## Design system

Tokens and type from `docs/03-design-system.md`: every number mono, labels
uppercase 10.5px tracked faint, 3px radius, 2px left border encoding state
(rust on today's header card), 150ms colour transitions only,
`prefers-reduced-motion` respected, visible focus. Touch targets ≥ 44px
everywhere, including `✕`.

## Testing

- **Unit** (Vitest, hand-checked values): remaining and over arithmetic;
  7-day trailing average by calendar day, with missed days not widening the
  window; item ordering and top-six selection; Zod schemas at the bounds.
- **Integration**, against the dev database: `logItem` on a date with no
  `Day` creates it; likewise for a past date; `quickAdd` with `save` creates
  and links an item; `updateEntry` leaves the `FoodItem` unchanged;
  `removeEntry` keeps the `Day`.
- **Visual**: `/verify-ui` on `/` mid-day, `/` empty, and the sheet open, at
  390 and 1280.
- **Done** when Phase 2's bar is met: three consecutive real days logged
  from the phone without a laptop.
