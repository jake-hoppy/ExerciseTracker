# Research brief

Questions worth answering before committing to integrations. Each is
independent, so these fan out well across parallel research agents.

Run with the `researcher` subagent. Ask for a recommendation with reasoning,
not a list of links. Write findings back into this file under each question.

---

## Q1. Getting bodyweight in without typing it

Smart scales that expose data: Withings, Renpho, Eufy, Wyze. Which have a
real API or export? What does Apple Health / Google Fit offer a web app?

**Why it matters:** a morning weigh-in is the single highest-friction daily
entry, and it's the one that feeds the rolling average. Removing that friction
is worth more than any chart.

**Findings:**

## Q2. Reading from Apple Health / Strava

Runs are already tracked somewhere. Is there a supported path to pull
distance, duration and calorie estimates into a web app? Apple Health has no
web API — what is the actual bridge? Strava's API terms and rate limits?

**Findings:**

## Q3. Food logging — ANSWERED, no research needed

Resolved without research: a saved-items list, not a food database. See
`docs/07-food-log.md`.

The pattern is a small set of repeated meals, so an external API would be
build cost and an ongoing dependency serving maybe fifteen items that could
be typed once. Don't reopen this.

## Q4. Hosting and cost

Vercel + Neon free tiers for a single-user app — real limits, cold start
behaviour, what happens at the boundary. Alternatives: Railway, Fly.io,
Cloudflare.

**Findings:**

## Q5. PWA offline logging

Service worker + IndexedDB + background sync for logging in a gym basement
with no signal. What does this actually cost to build and maintain? Is
"queue the write and retry" enough, or is real conflict resolution needed for
a single user on two devices?

**Findings:**

## Q6. Surfacing on the website

Depends on decision D2. If a public summary is wanted: what's safe to expose,
what's the cleanest shape (static build-time fetch vs. an API route), and how
to avoid making a private log accidentally public.

**Findings:**

## Q7. What actually predicts adherence

Softer, and more important than any of the above. The prototype was used for
30 days and then abandoned — not because it lacked features, but because it
lived in a browser tab. Worth a look at what's actually known about habit
tracking and logging friction before adding a single feature.

Specifically: do streaks help or do they cause abandonment after a break?
Is a daily reminder effective, or noise?

**Findings:**
