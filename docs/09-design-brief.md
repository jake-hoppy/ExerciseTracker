# Design brief

The input for `/superpowers:brainstorm` and `/frontend-design:frontend-design`.

Paste this whole file as the prompt, with the wireframes attached. It is
deliberately opinionated about constraints and deliberately silent about
visual solutions — the solutions are what those tools are for.

---

## What it is

A personal training and nutrition tracker. One user. Logs food, bodyweight and
whether he trained, across fixed-length training blocks, and answers one
question: **is this block working?**

It replaces a single-file HTML prototype that ran one complete 30-day cut and
was then abandoned — not for lack of features, but because it lived in a
browser tab that was hard to find and the data was stuck in one browser.

## Who uses it, and when

A 22-year-old CS student, lifting six days a week, running four. Three moments
matter:

1. **6:00am, just woke up, one hand, standing on a scale.** Enters one number.
   This must be nearly instant — if it takes thought, it stops happening.
2. **After a meal, phone in hand, possibly in a car.** Logs what he ate.
   Almost always something he's eaten before.
3. **6:00pm, deciding what's for dinner.** Wants one answer: how much room is
   left today.

Not a desktop app that also works on mobile. **A phone app that also works on
desktop.**

## The interaction that defines success

**Logging a repeat meal in three taps or fewer, from cold open.**

The same fifteen-ish meals recur constantly — over one block the same burrito
bowl and protein shake were looked up three separate times. If logging is slow,
logging stops, and the app is dead. Everything else is negotiable; this isn't.

Design for fifteen frequent items, not a million rare ones. There is no food
database and no search-first flow.

## Screens

| Screen | Job |
|---|---|
| **Today** | Default route. Log food, weight, trained. Show what's left today. |
| **Add food** | Saved items by frequency, quick-add for one-offs. The 3-tap path. |
| **Block** | All days, scrollable, editable inline. |
| **Trends** | Weight over time. Calories and protein against target. |
| **Unlock** | Four digits. |

## Content rules that shape the UI

- **Lead with remaining, not totals.** "740 left · 38g to go" answers the
  question actually being asked at 6pm. Totals report; remaining directs.
- **Weight always shows the 7-day rolling average first.** Single-day weight
  swings 2–3 lbs on water. A raw daily number presented as the headline is
  noise dressed as signal. Raw readings are a thin line; the average is the
  prominent one.
- **A logged day is a logged day.** The streak counts whether food was logged,
  not whether targets were hit. Never scold. 2,800 against a 2,100 target is
  still a green day.
- **No ceremony.** No checkbox next to the number it describes. No save button.
  No confirmation toasts for routine entry.
- **Empty means unlogged, not zero.** A day with no entry must not read as a
  zero-calorie day.

## Visual direction

Existing tokens, in `docs/03-design-system.md` — dark, outdoors, utilitarian.
Moss green for complete, rust for today, monospace for every number.

Treat that as the starting point, not a cage. If the design process produces
something better for the phone-first reality, say so and show it — but the
direction is a field notebook, not a SaaS dashboard, and every number is
monospace.

## Hard constraints

- **390px is the primary design width.** Desktop is the adaptation.
- **Touch targets ≥ 44px.** The prototype shipped 14px checkboxes; that was a
  real failure, used half-asleep.
- Numeric inputs use the right mobile keypad.
- Visible keyboard focus. `prefers-reduced-motion` respected.
- Ships as a normal web app; installable to the home screen later.

## Don't design

- Lift logging, sets and reps — cut, decision D5
- Waist, resting heart rate, sleep, any metrics beyond food and weight — cut,
  decision D4
- Onboarding flows, social features, badges, streaks-as-gamification
- A settings screen beyond block targets

Each of these was considered and deliberately excluded. See
`docs/01-architecture-decisions.md` and `docs/02-roadmap.md`.

## Wireframes to produce first

Before the brainstorm, wireframe these four, in this order:

1. **Today, mid-day, three items logged.** Most important screen in the app.
2. **Add food, sheet open.** The 3-tap path. Count the taps on the wireframe.
3. **Today, 6am, nothing logged yet.** The empty state that starts every day.
4. **Trends.** Rolling average against raw dailies without looking cluttered.

Wireframes, not mockups — boxes and labels. The point is to argue about layout
and flow before anything gets styled.

## Read alongside this

- `docs/04-domain-rules.md` — binding behaviour, non-negotiable
- `docs/07-food-log.md` — the food log design and the seed item list
- `docs/03-design-system.md` — tokens
- `docs/02-roadmap.md` — what's in scope
