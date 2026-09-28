# Design system

Chalk on slate. A ledger read under low light — still a field notebook, not a
SaaS dashboard, and still dark, because the first use of the day is at 6am
one-handed on a scale.

This replaced the olive/moss/rust system carried over from the prototype. That
one failed for a specific reason worth remembering: moss, rust and the olive
ground were all the same temperature, so nothing separated from anything, and
every row on Today carried the same visual weight as the 6pm question.

## The idea

**"Logged" is encoded as brightness, not hue.** Chalk is what you write with,
so a day with something on it is literally brighter than one without. That
frees the palette down to a single accent, and the discipline of one hue is
most of the character.

## Color

```css
--color-board:      #181E2A;   /* page — clearly blue, not a tinted black */
--color-board-2:    #1F2735;   /* inset, sheet, hover */
--color-board-3:    #27303F;   /* raised */
--color-rule:       #333E4F;   /* borders, unfilled tally ticks */
--color-rule-soft:  #262F3D;   /* dividers */

--color-chalk:      #ECE9E1;   /* primary text, logged, the rolling average */
--color-chalk-2:    #9AA5B4;   /* secondary, chart bars */
--color-chalk-3:    #7C8593;   /* labels, axis, raw weight readings */

--color-gold:       #E9A53A;   /* today, the target line, the tally notch */
--color-gold-dim:   #A6762A;
--color-over:       #EE6A5C;   /* over target — a stated fact, never a scold */
```

Gold is the only hue. It marks one thing: *the mark to hit, or where you are
now*. If something new needs a colour, it almost certainly needs a rule or a
brightness step instead.

State on a day row: gold = today, chalk = logged, `--color-rule` = a scheduled
rest day, nothing at all = an unlogged day. All on a 2px left rule.

Page background is flat board under one cold wash off the top edge. No
decorative gradients.

## Type

| Role | Face | Use |
|---|---|---|
| Display / prose | **Archivo** 400–700 | Headings, session names, food names, notes |
| Utility | **IBM Plex Mono** | Every number, date, label, axis tick |

Rule: **all data is monospace.** Dates, weights, calories, counts. It makes
columns scan and it's most of the page's character.

Two families, not three — the prototype's serif was dropped, and prose now
sets in the same grotesque as everything else.

Labels (`.label`) are mono, 11px, **sentence case**. A tracked-out uppercase
eyebrow above every section is a tell; it was removed. Small caps survive in
exactly one place: `.colhead`, the block table's column heads, where they
label real columns rather than decorate a section.

## The tally

The one bold element, and the only place to spend boldness. On Today, each
target gets a strip of discrete ticks that fill chalk as the day is logged,
with a taller gold notch at the target and visible room past it.

- The strip is wider than the target — the notch sits at 82% — so a day that
  runs over has somewhere to go.
- Over-target ticks change to `--over` and nothing else changes.
- Every layer spans the full width and is **clipped, never resized**, so the
  ticks stay in register across layers.

It's counting marks, not a progress bar. Don't turn it into one.

## Shape and motion

- `border-radius: 2px`. Structure comes from rules, never from cards.
- **No shadows anywhere.** No filled card kit, no gradient decoration.
- Transitions 150ms on colour and border only. No entrance animations.
- Respect `prefers-reduced-motion`.

## Non-negotiables

- **Touch targets ≥ 44px.** Used one-handed, early, half-awake. The prototype
  shipped 14px checkboxes and that was wrong.
- **390px is a first-class width**, not an afterthought. Verify there before
  calling a screen done.
- Visible keyboard focus everywhere: 2px `--gold` outline, 2px offset.
- Inputs are `inputmode="decimal"` / `"numeric"` so phones show the right pad.
- SVG charts: text scales inversely to viewBox compression, or labels render
  unreadably small on a phone. Widen gutters on narrow screens; thin out axis
  labels rather than letting them collide.
- A repeated control must not stack up into noise. Thirty untrained cells in
  the block view get a near-invisible rule, not thirty boxes.

## Voice

Plain and direct. "Log the day, hold the line." Never congratulatory, never
scolding. An empty state says what to do next; it doesn't apologise. No `›`
appended to link text — a rule and the name is enough.
