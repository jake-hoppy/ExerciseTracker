# Roadmap

Phases exist to stop the project drowning in scope. **Finish a phase, use it
for real, then start the next one.** A half-built Phase 4 makes Phase 2
unusable, which is how personal projects die.

Each phase ends with a stop-for-review checkpoint.

---

## Phase 1 — It exists and it persists

- Scaffold, database, schema, migrations
- Seed the completed 30-day block from `data/seed-block.json`
- One route that lists days and their logged values

**Done when:** the finished block's data is in a real database and renders.

## Phase 1.5 — Design pass

Before building screens, run the design workflow in `docs/09-design-brief.md`:
wireframe the four key screens, then `/superpowers:brainstorm` and
`/frontend-design:frontend-design` with the brief and wireframes as input.

Output is a design plan committed to the repo. Phase 2 implements it rather
than improvising screens while also building data plumbing.

## Phase 2 — It's usable daily

- **Today screen** as the default route: food entries with running totals,
  weight, a `trained` tick, notes
- **Food log with saved items** — see `docs/07-food-log.md`. This is the core
  of the app, not a Phase 4 extra. Seed the item list up front.
- Writes persist immediately; no explicit save button
- Works one-handed at 390px wide — this gets used half-asleep
- Block view: every day, grouped, editable inline

- **PIN lock** over the whole app — see `docs/06-pin-lock.md`
- Deployed to Vercel with the Neon database live

**Done when:** you've logged three consecutive real days on your phone without
opening a laptop. Use it for a week before Phase 3.

## Phase 3 — It tells you something

- Weight chart: raw dailies plus 7-day rolling average, start and goal lines
- Calories and protein per day against target
- Streaks, completion counts, block summary
- Stats module fully unit-tested against `docs/04-domain-rules.md`

**Done when:** you can answer "is this block working?" without doing arithmetic.

## Phase 4 — Depth

Pick from these based on what Phases 2–3 made you want. Don't build all of it.

- **Block creation UI** — name, date range, repeating pattern → generates days
- **Block comparison** — this block against the last one
- **Import/export** — JSON in and out

## Phase 5 — Reach

- PWA: installable, offline logging, background sync
- Public read-only summary for the website (see decision D2)
- Integrations — only after the research in `docs/05-research-brief.md`

---

## Deliberately not doing

Lift logging (decision D5). A metrics table — waist, resting HR, sleep
(decision D4). An external food database or barcode scanning
(`docs/07-food-log.md`). Social features. AI meal photo recognition. Workout
program generation. Gamification badges.

Each is a product on its own, and none of them address why the prototype
stopped getting used — which was that it wasn't on the phone.
