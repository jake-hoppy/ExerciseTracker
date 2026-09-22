# Today screen — design direction

Output of the frontend-design pass over
`docs/superpowers/plans/2026-09-21-today-and-food-log.md`. The plan says what
each component does; this says what it looks like and why. Where the two
disagree on a class name or a wrapper, this wins.

Inputs: `docs/09-design-brief.md` (constraints), `docs/03-design-system.md`
(tokens), `docs/07-food-log.md` (the 3-tap rule).

## The subject

A field notebook for one person's cut. Not a dashboard, not a fitness app
with rings. The vernacular is a ruled ledger page: entries written in as
they happen, a line ruled under them, a sum. That is the whole visual idea,
and everything below is that idea applied.

## Tokens

Colour, from `docs/03-design-system.md`, used with these jobs and no others:

| Token | Hex | Job on Today |
|---|---|---|
| `--bg` | `#262C29` | page |
| `--surface` | `#343B37` | the one raised region: the add-food sheet |
| `--line` / `--line-soft` | `#4E564F` / `#404842` | ledger rules |
| `--ink` / `--ink-dim` / `--ink-faint` | `#F2EFE6` / `#B7BEB8` / `#818B83` | entry names / totals / labels and rules' captions |
| `--parchment` | `#F5F0DF` | the remaining figures only |
| `--moss` | `#8CAD7B` | done: logged rows' margin tick, the Trained stamp |
| `--rust` | `#D08A48` | now: today's date, focus ring. Nothing else. |
| `--danger` | `#C96B4C` | over target, failed save |

Type, from the system, with roles held strictly:

- **Oswald 600** — the session name and the two remaining figures. Nothing
  else on the page is display size.
- **JetBrains Mono** — every number, the date, the labels. Numbers are
  `tabular-nums` and right-aligned in fixed columns so the ledger scans.
- **Source Serif 4** — entry names, item names, notes. The only serif on the
  page is the thing you wrote down.

## Layout

Left-aligned throughout. The page is one column at 390px; at 1280px it stays
one column, `max-w-2xl`, centred, because a ledger doesn't get wider when the
desk does. No cards on Today — rows are separated by 1px `--line-soft` rules,
and the day's header is set off by a 2px rust rule at its left margin (the
system's "today" encoding), which turns `--line` on any other date.

```
┌──────────────────────────────────────┐
│‖ ‹      Mon Sep 21 · today        ›  │  rust left rule = today
│‖ Push + Run                          │  Oswald, mixed case
│‖                          [TRAINED]  │  stamp: mono, boxed, moss when set
│‖                                     │
│‖ 1,109 left           24 g to go     │  Oswald, parchment
│‖ ───────────────────────────────     │  1px rule: the ledger sum line
│‖ 991 of 2,100          126 of 150    │  mono, ink-dim
│‖ Weight 178.2   7-day 178.9          │  mono; tap the number
├──────────────────────────────────────┤
│ Logged                               │  label
│ ✓ Konala chicken burrito bowl 751 54 │  serif name, mono cols, moss tick
│ ✓ Core Power Elite chocolate  240 42 │
│ ✓ Fairlife chocolate milk     150 30 │
├──────────────────────────────────────┤
│ Log                                  │
│ + Konala chicken burrito bowl 751 54 │  same columns, ink-faint "+"
│ + Core Power Elite chocolate  240 42 │
│ + Fairlife chocolate milk     150 30 │
│ + Chick-fil-A spicy sandwich  450 28 │
│ + Large egg                    72  6 │
│ + Jimmy Dean sausage          323 14 │
│   All items and quick add        ›   │
├──────────────────────────────────────┤
│ Notes                                │
│ Legs felt heavy, cut the run.        │  serif
└──────────────────────────────────────┘
```

The two lists share one column grid — `[1.25rem_1fr_3.5rem_3rem_2.75rem]`
at 390px — so a logged row and a loggable row line up number-for-number. The
glyph in the margin is the only thing that says which list you're in: a
moss `✓` for written down, an ink-faint `+` for available. The `✕` on a
logged row lives in the last column, 44px square, ink-faint until focused.

Rows are 44px minimum with the tap target being the whole row, not the
name. A tap on a Log row flashes the row's rule moss for 150ms and the entry
appears under Logged; nothing else moves.

**The 6am state** is the same page with Logged absent, the remaining line
reading the full targets, and `Weight —` as the largest tap target in the
header. No empty-state copy: the ruled page is the invitation.

**The add-food sheet** is the one surface on the page, `--surface`, rising
from the bottom with a 1px `--line` top rule, no rounded top at 390px (3px
at desktop). Inside, the same column grid as Today so numbers keep lining
up. Quick add is two mono inputs and a "Log" button on one 44px line; the
name field and "Save to list" sit under it, quieter. The items list follows,
then "New item", then "Close". Section captions ("Quick add", "Items") use
the system's `.label`; nothing else in the sheet is uppercase.

## Components, specifically

- **Date strip** — `‹` and `›` are 44px squares at the margins. The date is
  mono, mixed case: `Mon Sep 21 · today`. A block name follows after a
  second middle dot only when one covers the day.
- **Session** — Oswald 600, ~30px, mixed case: `Push + Run`. Rest days set it
  in `--ink-dim`.
- **Trained** — a boxed mono word, `TRAINED`, 1px `--line` border. Set: fill
  `--moss` at 15%, border and text `--moss`, text `TRAINED ✓`. The box reads
  as a stamp on the page, which is what it is. Uppercase here is deliberate
  and it is the only uppercase word outside `.label` captions.
- **Remaining** — two Oswald figures on one line, parchment. Unit and verb
  are mono `--ink-dim` at body size: `1,109` then ` left`; `24 g` then
  ` to go`. Over target: the figure and the word `over` in `--danger`, same
  size, no other change. A 1px rule beneath, then the totals line in mono
  `--ink-dim`: `991 of 2,100` and `126 of 150`. "of", not a slash — it's a
  sentence, not a fraction.
- **Weight** — one mono line: `Weight` as a `.label`, the reading at 18px
  `--ink`, then the average in `--ink-dim` with its window: `7-day 178.9`.
  Tapping the reading swaps in a 6-character decimal input, same size, same
  place. An invalid entry gets the rust outline and keeps the old value.
- **Logged rows** — serif name, truncated; mono kcal and protein
  right-aligned; `✕`. Tapping the name area expands the row in place to two
  mono inputs and `Done`. Pending rows (optimistic) are at 60% opacity.
- **Log rows** — identical grid, `+` in the margin. No `✕` column; the space
  stays empty so the numbers still align.
- **"All items and quick add"** — a row in the Log list, ink-dim, `›` at the
  right; not a button-shaped button.
- **Notes** — a serif textarea with no border until focused; placeholder is
  the em dash. It reads as the next blank line on the page.
- **Failed save** — one mono line under the affected row, `--danger`:
  `Didn't save — tap to retry`.

## Principles

1. Rules, not boxes. A ledger has lines under things; it doesn't put each
   line in a card.
2. Numbers in columns. Every kcal figure on the page sits in the same
   column; every protein figure in the next. That alignment is most of the
   character and all of the scannability.
3. One accent per meaning. Rust means now. Moss means done. Danger means
   over or failed. Nothing is coloured for emphasis.
4. The written word is serif. Anything the person typed or chose — a meal, a
   note — is Source Serif; anything the system produced is mono.
5. Nothing appears on load. The only motion is a 150ms colour change that
   answers a tap.

## Reviewed against the defaults

- *Dark page with a single bright accent*: no — two muted accents with fixed
  meanings, from the brief.
- *SaaS card kit*: the Phase 1 list was a card per row. Today drops cards for
  ruled rows; the one surface is the sheet.
- *All-caps eyebrow over every section*: the system's `.label` captions are
  kept where the brief specifies them (three on the page) and not multiplied.
  The date, session and remaining line are mixed case, against the plan's
  draft which uppercased the date.
- *Middle-dot meta strings*: used once, in the date strip, as the brief's own
  content rule writes it. The plan's `751 · 54` pairs become two columns.
- *Big number with small label as the hero*: kept, because at 6pm "how much
  is left" is the question, and the answer is a number. Made specific by
  setting it as a ledger sum with a rule under it and the totals as a
  sentence, not by a gradient or a ring.
- *Monospace for data labels*: pinned by the brief, kept.

## Changes to the plan

- Task 4 `Remaining`: totals line reads `991 of 2,100 kcal`, not `991 / 2,100`.
- Tasks 6–7 `ItemRow`, `EntryRow`: use the shared five-column grid and
  margin glyph instead of `justify-between` with `751 · 54`. Drop the
  per-row `rounded-card bg-surface`; rows are rule-separated.
- Task 5 `DateNav`: mixed-case date; drop `uppercase` from the label span.
- Task 7 sheet trigger copy: `All items and quick add`.
- Task 8 applies this document in the visual pass; `/verify-ui` reviews
  against it alongside `docs/03-design-system.md`.
