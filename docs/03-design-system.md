# Design system

Carried over from the prototype. The direction is dark, outdoors, utilitarian
— a field notebook, not a SaaS dashboard. Keep it.

## Color

```css
--bg:         #262C29;   /* page */
--bg-alt:     #2D3430;   /* inset / completed rows */
--surface:    #343B37;   /* cards */
--surface-2:  #3D453F;   /* raised panels */
--line:       #4E564F;   /* borders */
--line-soft:  #404842;   /* dividers */

--ink:        #F2EFE6;   /* primary text */
--ink-dim:    #B7BEB8;   /* secondary */
--ink-faint:  #818B83;   /* labels, axis */

--moss:       #8CAD7B;   /* complete, on-target, the rolling average line */
--moss-dim:   #6C8961;
--rust:       #D08A48;   /* today, accents, the goal line */
--rust-dim:   #A16C34;
--parchment:  #F5F0DF;   /* emphasis numerals */
--danger:     #C96B4C;   /* over target, regression */
```

Page background carries two radial gradients — a green wash from top-left, a
warm one from top-right — over `--bg`.

## Type

| Role | Face | Use |
|---|---|---|
| Display | **Oswald** 500/600 | Headings, workout names, stat numerals |
| Body | **Source Serif 4** | Prose, notes, descriptions |
| Utility | **JetBrains Mono** | Every number, label, date, axis tick |

Rule: **all data is monospace.** Dates, weights, calories, counts. It makes
columns scan and it's most of the page's character.

Labels are uppercase, ~10–11px, `letter-spacing: 0.1em`, `--ink-faint`.

## Shape and motion

- `border-radius: 3px`. Not pill-shaped, not square.
- Cards carry a 2px left border that encodes state: `--line` default,
  `--moss` complete, `--rust` today, `--ink-faint` rest day.
- Transitions 150ms on color and border only. No entrance animations.
- Respect `prefers-reduced-motion`.

## Non-negotiables

- **Touch targets ≥ 44px.** Used one-handed, early, half-awake. The prototype
  shipped 14px checkboxes and that was wrong.
- **390px is a first-class width**, not an afterthought. Verify there before
  calling a screen done.
- Visible keyboard focus everywhere: 2px `--rust` outline, 2px offset.
- Inputs are `inputmode="decimal"` / `"numeric"` so phones show the right pad.
- SVG charts: text scales inversely to viewBox compression, or labels render
  unreadably small on a phone. Widen gutters on narrow screens; thin out axis
  labels rather than letting them collide.

## Voice

Plain and direct. "Log the day, hold the line." Never congratulatory, never
scolding. An empty state says what to do next; it doesn't apologise.
