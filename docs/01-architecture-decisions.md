# Architecture decisions

Open questions, each with options and a recommendation. Work through these
before Phase 2. Record the answer inline, then port the one-line result into
`CLAUDE.md`.

---

## D1. Where does this run?

The answer drives everything else, so settle it first.

| Option | Good | Bad |
|---|---|---|
| **A. Local-only web app** | Fastest to build. No hosting, no cost. Full control. | Not on the phone — which is where a 6am weigh-in gets logged. Likely fatal. |
| **B. Deployed web app** (Vercel + hosted Postgres) | Phone access via browser. Free tier covers one user. Deploys from the repo. | Needs a hosted DB. Cold starts. |
| **C. PWA, deployed + installable** | B, plus a home-screen icon and offline logging. | Service worker and offline sync are real work. |
| **D. Native / React Native** | Best logging experience. Health data access. | Weeks, not days. |

**Recommendation: B now, C later.** The prototype died partly because it lived
in a browser tab you couldn't find. Phone access is the requirement that
actually determines whether this gets used. C is a Phase 5 upgrade of B, not a
rewrite — build B so the upgrade stays cheap.

**DECIDED: B — deployed web app on Vercel.** Phone access is a hard
requirement, not a nice-to-have; a local-only build repeats the prototype's
failure. Build it responsive and installable-shaped so the Phase 5 PWA upgrade
is additive.

No auth in Phase 1 — the deployed URL is unlisted but not private.

**DECIDED: a 4-digit PIN gate in Phase 2.** Full spec in `docs/06-pin-lock.md`.
The PIN lives in an environment variable, never in source; the session cookie
holds a separate secret; attempts are rate limited. Real auth (Clerk, Auth.js)
is overkill for one user and can replace this if the data ever justifies it.

---

## D2. Relationship to the existing website

You mentioned applying this to your site. Three different things hide in that:

1. **Same repo, same deployment, a route like `/training`.** Simplest if the
   site is already Next.js. One deploy, shared design system.
2. **Separate app, linked from the site.** Clean separation. Two deploys.
3. **Separate app that exposes a public read-only summary** the site renders —
   current streak, block progress. A small public API.

**Needed to answer this:** what the existing site is built with, whether it
has a backend, and whether any of this should be publicly visible. Bring that
to the architecture conversation.

**Decision:**

---

## D3. Database

| Option | Notes |
|---|---|
| **SQLite + Prisma** | Trivial locally. Needs Turso or LiteFS to deploy. |
| **Postgres + Prisma** (Neon, Supabase) | Free tier is ample for one user. Same Prisma code. Deploys anywhere. |
| **Supabase** | Postgres plus auth and storage, if auth ever matters. Heavier. |

**DECIDED: Postgres on Neon, via Prisma.** Follows from D1 — a deployed app
needs a hosted database, and starting on SQLite would mean migrating later for
no gain. Free tier is 0.5GB against a few KB of real data.

Keep the schema free of Postgres-specific types so it stays portable. Back up
with `pg_dump` periodically; the whole point of this rebuild is that the data
stops being trapped somewhere.

---

## D4. Schema shape — the one that matters

The prototype hardcoded a 30-day schedule. That was its main structural flaw:
a second block meant editing source.

Proposed:

```
Block    a named date range with targets
Day      one calendar day in a block, with its planned session and logged values
Session  OPTIONAL, Phase 4 — individual exercises, sets, reps, load
Metric   OPTIONAL, Phase 4 — arbitrary tracked measurements (waist, resting HR)
```

**The real question: does `Day` carry fixed columns, or is everything a
`Metric` row?**

- Fixed columns are faster to build, easier to query, and cover what you
  actually log today.
- A metric table is flexible but turns every screen into a join and a pivot.

**DECIDED, and narrowed further after review:**

```prisma
Day  date, blockId, workoutTypeId, trained (Boolean), weight (Float?), notes
```

That is the whole of `Day`. Calories and protein are NOT columns — they sum
from `Entry` rows (see `docs/07-food-log.md` and rule R6c).

**Cut, deliberately:**
- The `Metric` table. Never being built. Resting HR, sleep and the rest are
  fields that would sit empty every day, and an empty field makes a complete
  day look unfinished.
- `waist`. Same reason — it was proposed on the theory it *should* be tracked,
  not because anyone would track it.
- `foodLogged` and `proteinHit` booleans. The logged numbers are the record;
  a checkbox beside them is ceremony.
- `workoutDone` collapses to a single `trained` boolean.

The principle: **a field nobody fills is worse than no field.** Don't add one
back without someone saying they'll use it.

---

## D4b. How a block's schedule is defined

**The prototype's central flaw was hardcoding 30 dates in source.** Nothing
about block length or schedule may live in code.

Two ways people actually schedule, and both need supporting:

- **Weekly** — "Monday is Push, Tuesday is Pull, Wednesday off." Anchored to
  weekdays. Fits around a class schedule.
- **Cycle** — "Push, Pull, Legs, Rest, repeat" regardless of weekday. The
  Aug–Sep block was this: a 4-day rotation that drifted across the week.

**DECIDED: support both, and treat the pattern as a GENERATOR, not the source
of truth.**

```
WorkoutType    id, name ("Push + Run"), isRest      — user-defined, reused across blocks
Block          scheduleMode: "weekly" | "cycle"
               pattern: JSON  {mon: typeId, ...} | [typeId, typeId, ...]
Day            workoutTypeId  — generated from the pattern, then freely editable
```

Creating a block runs the pattern to generate its `Day` rows. **After that,
each day's workout is independently editable.** Swapping one Thursday's legs
session for a run must not require touching the template or fighting it.
Templates that stay authoritative are the ones people work around.

`WorkoutType` is a table, not a free-text string on `Day` — so a session is
something defined once and reused, not retyped and eventually typo'd.

---

## D5. Lift logging — the big scope question

The prototype tracked *that* you trained, not *what* you lifted. Real set-and-
rep logging is the single largest feature here, and it is genuinely useful:
the honest test of whether a cut preserved muscle is whether your working
weights held.

But it is also a different app. Logging sets during a session has completely
different UX demands from a once-a-day check-in — fast entry, last-session
recall, rest timers, one-handed use between sets.

**DECIDED: not building it.** The stated scope is calories and protein, full
stop — those are the two things worth the daily effort. Set-and-rep logging is
a different app with different UX demands, and it would sit unused like the
metrics table would have.

Revisit only if a specific question comes up that the data can't answer — the
honest one being "did my working weights hold through the cut?" Even then,
check whether a notes field covers it before building a schema.

---

## D7. Calorie and protein targets

A two-tier target was proposed — a higher figure on training days, lower on
rest days — on the grounds that TDEE swings roughly 800 calories between a
rest day and a lift-plus-run day, so a flat number puts most of the deficit on
the hardest days.

**DECIDED, by the person who has to eat the food: a single flat calorie target
across all days.**

```
Block.calTarget       e.g. 2100
Block.proteinTarget   e.g. 150
```

The reasoning is adherence. One number that needs no thought beats a two-tier
system that gets abandoned in week three, and a full 30-day block was already
run successfully on a flat 2,100.

**Do not reintroduce per-day-type targets** — not as an option, not as a
settings toggle, not as two columns set to the same value. This was raised,
argued, and settled. Build the single-target version.

The day card compares logged calories against `calTarget` and logged protein
against `proteinTarget`, and shows the delta. Same on every day, rest included.

---

## D6. Multi-agent workflow

Where parallel agents genuinely help here, and where they don't:

**Worth it:**
- **Research** (`docs/05-research-brief.md`) — several independent questions,
  no shared state. Fan out, collect, synthesise.
- **UI review** — a reviewer that hasn't seen the code critiques the rendered
  screenshot. Independence is the point; work that grades itself grades gently.
- **Correctness review** of the stats module against `docs/04-domain-rules.md`.

**Not worth it:**
- Splitting one feature across agents. Coordination costs more than it saves
  on a codebase this size, and they'll conflict in the same files.
- A "planner" agent that just restates the roadmap.

Definitions live in `.claude/agents/`. Use them where they earn it.
