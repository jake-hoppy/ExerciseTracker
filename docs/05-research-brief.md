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

**Recommendation: don't build a scale-brand API integration. Use an iOS Shortcuts personal automation that reads the latest weight sample from Apple Health and POSTs it to an API route.** Every mainstream scale app (Withings, Renpho, Eufy, Wyze) already writes weight to Apple Health on iOS, so this path is brand-agnostic and survives a scale upgrade. Cost: 1–2 hours for the Shortcut plus a small `/api/weigh-in` route guarded by a shared secret; $0 ongoing; near-zero maintenance ([worked example](https://blog.maximeheckel.com/posts/build-personal-health-api-shortcuts-serverless/)). The catch: automations can't run silently while the phone is locked — turn "Ask Before Running" off and use a trigger like a time of day or opening an app, and expect one tap or unlock most mornings. There is genuinely **no** Apple Health web API — no HealthKit in Safari, no OAuth a server can call ([Momentum](https://www.themomentum.ai/blog/do-you-need-a-mobile-app-to-access-apple-health-data)) — so Shortcuts is the only web-reachable path to Health data.

**Withings is the one vendor API worth building, and only if that's the scale in use.** Free self-serve OAuth2 registration for individual apps, a demo-user sandbox, and webhooks that push new measurements — no partner-certification gate for single-user personal use ([register](https://developer.withings.com/developer-guide/getting-started/register-to-withings-api/), [demo user](https://developer.withings.com/developer-guide/data-api/demo-user/)). About half a day: OAuth flow, token refresh, webhook receiver on Vercel. Maintenance is low but real (refresh-token rotation, API-version churn).

**The rest are traps.**
- **Renpho** — no official API; only an unofficial reverse-engineered client hitting private endpoints, which can break without notice ([renpho-api](https://github.com/danvaneijck/renpho-api)).
- **Eufy** — no API and no in-app export; extraction means pulling a SQLite DB off an Android install ([community thread](https://community.eufy.com/t/raw-readings-and-data-export-for-smart-scale/475006)).
- **Wyze** — has a developer API, but for the smart-home platform; scale data isn't a documented scope ([forum](https://forums.wyze.com/t/wyze-api-for-health-data/128002)).
- **Google Fit** — closed to new signups since May 2024, APIs shut down at end of 2026 ([migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit)). Health Connect is Android on-device only — irrelevant for an iPhone and a web app.

**Verdict:** worth doing, as the Shortcuts → Apple Health bridge. Add Withings-direct only if/when that's the actual scale.

**Read with Q2.** Q2 found that time-of-day Shortcuts automations can silently fail to sync, with no error shown. A weigh-in Shortcut that runs when you tap it, or unlock the phone, avoids that; a silent scheduled one doesn't. Whichever is built, the app should make a missing weigh-in obvious, not assume the sync ran.

## Q2. Reading from Apple Health / Strava

Runs are already tracked somewhere. Is there a supported path to pull
distance, duration and calorie estimates into a web app? Apple Health has no
web API — what is the actual bridge? Strava's API terms and rate limits?

**Findings:**

**Recommendation: later, and via Strava only — if runs are already in Strava.** Don't build two bridges when one covers it. It isn't a now feature: `CLAUDE.md` lists wearable sync as a v1 non-goal, and the app records `trained` as a boolean with no distance/duration detail, so there's nothing yet for this data to land in.

**Apple Health — no web API, period.** The only bridges are (a) the built-in Shortcuts app ("Find Health Samples" + an HTTP POST, on a time-of-day automation), or (b) a paid exporter such as Health Auto Export ($1.99/mo, $6.99/yr or $24.99 lifetime) that adds scheduling, retries and field mapping ([app](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069), [server example](https://github.com/Lybron/health-auto-export)). Both share a trap: time-of-day personal automations are unreliable in the background, and Shortcuts gets no HealthKit background-delivery hook — a run can silently fail to sync with no error, which is worse than a manual tick for a daily tracker that has to be trusted.

**Strava has a real, well-scoped REST API.** OAuth2, with "Single Player Mode" as the default for new apps: 200 requests/15 min and 2,000/day, no review queue for the single-user case ([rate limits](https://developers.strava.com/docs/rate-limits/)). The June 2026 API Agreement update forbids showing a user's data to third parties and using API data for AI/ML training ([agreement](https://www.strava.com/legal/api), [policy](https://www.strava.com/legal/api_policy)) — neither applies to a private single-user tracker. "Powered by Strava" attribution is required ([guidelines](https://developers.strava.com/guidelines/)); cosmetic, not a blocker.

**Cost.** Strava: OAuth + token refresh + pulling recent activities, roughly 4–8 hours, $0 ongoing, low maintenance. Apple Health: 2–4 hours for a Shortcut, plus a subscription if using an exporter, plus babysitting when syncs silently drop.

**Verdict:** worth doing later via Strava, only if runs are actually logged there. Not worth building an Apple Health bridge for runs at all. It shouldn't jump ahead of Phase 2.

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

**Recommendation: the current setup (Vercel Hobby + Neon Free) is fine — do not switch.** Nothing in this app's traffic profile (a handful of writes/day, KBs of data, one user) gets remotely close to either platform's ceilings. The only real cost is a 1–3 second cold start on the first request of the day, which is an acceptable, cosmetic annoyance for a personal morning-check app, not a reason to re-architect.

**Vercel Hobby, actual numbers:** 100 GB bandwidth/month, 1M function invocations, 1M edge requests, 4 hours "Active CPU", 360 GB-hrs provisioned memory — all far beyond a single-user tracker ([Hobby plan](https://vercel.com/docs/plans/hobby), [pricing](https://vercel.com/pricing)). Crossing bandwidth or function limits pauses the project until the next billing cycle rather than auto-billing — no surprise charge on Hobby, just a temporary outage, which for a personal app would take being badly abused or scraped. The clause that actually matters: **Hobby is licensed for non-commercial personal use only** — fine today, but revisit the plan the moment this app is monetized, shared publicly at scale, or built for a client.

**Neon Free, actual numbers:** 100 CU-hours/month compute (≈400 hrs at the default 0.25 CU — this app will use a tiny fraction), 0.5 GB storage, 10 branches, 5 GB data transfer ([plans](https://neon.com/docs/introduction/plans), [free plan limits](https://neon.com/faqs/free-plan-limits-and-quotas)). Compute auto-suspends after 5 minutes idle and this can't be disabled on Free. Real-world cold-start reports range from ~0.7s to a median ~1.8s (p95 2.6s, worst case ~3s) for the first query after suspend — exactly the "phone, first thing in the morning" case, so expect a visible but sub-3-second delay on the day's first load, not a timeout. Exceeding CU-hours or storage on Free doesn't bill you — there's no paid overage path; compute/writes get restricted until you upgrade to Launch ($19/mo+). At current usage this is a non-issue for years.

**Backups on Free:** point-in-time restore exists but with only a **6-hour** history window (7 days on Launch, 30 on Scale) ([backup & restore](https://neon.com/docs/guides/backup-restore)) — recovery from a bad migration or bug has to happen same-day. Given the tiny dataset, supplement with a scheduled `pg_dump` (a manual monthly one, or a GitHub Actions cron) as a durable off-platform backup; free, and under an hour to set up.

**Alternatives (Railway, Fly.io, Cloudflare):** none give a reason to move. Railway's free tier is effectively gone (usage-based trial credit); Fly.io's free allowances have shrunk and require a card; Cloudflare (Workers + D1/Hyperdrive) would mean rewriting the Prisma/Postgres data layer for marginal benefit. None solve cold start better for a scale-to-zero single-user DB.

**Verdict:** keep the current stack — a "leave it alone" case. Reconsider only if assumptions change (multiple users, monetizing, or needing sub-second cold response). The one action worth taking is the off-platform `pg_dump`.

## Q5. PWA offline logging

Service worker + IndexedDB + background sync for logging in a gym basement
with no signal. What does this actually cost to build and maintain? Is
"queue the write and retry" enough, or is real conflict resolution needed for
a single user on two devices?

**Findings:**

**Recommendation:** Build a manual outbox, not Background Sync. iOS Safari/WebKit has never implemented the Background Sync API and has no stated plans to — "unlikely soon," confirmed current as of Safari 26 on iOS 26.5 ([caniuse](https://caniuse.com/background-sync), [testmuai](https://www.testmuai.com/web-technologies/background-sync-safari/)). Replace it with an IndexedDB-backed write queue that flushes on three triggers: app load, the `online` event, and `visibilitychange`/focus (covers "walked out of the basement and reopened the app," which is the actual gym scenario — the `online` event alone is unreliable in iOS standalone mode). This is a same-tab, foreground-driven retry loop, not a true background service-worker sync — acceptable since the user is the one opening the app to log.

**Idempotency:** Client-generated IDs (UUID per entry, generated at write time) are sufficient — no real conflict resolution needed. Food entries are append-only: give the client ID a unique constraint in Prisma and `upsert` on retry, so a duplicate POST from a flaky retry is a no-op. For the last-write-wins Day fields (weight, trained, notes), attach a client timestamp and let the server accept whichever write has the later timestamp per field; with one user on two devices this resolves the only real case (edited on phone at the gym, then on laptop before the phone's queue flushed) without CRDTs or merge UI.

**Build effort:** roughly 1–2 days: outbox table in IndexedDB, flush-trigger wiring, idempotent upsert endpoints, unique constraint migration. Ongoing cost is low but real — periodic verification against actual iOS Safari, since simulators lie about storage/eviction behavior.

**The catch:** iOS can evict IndexedDB/Cache/SW data for an origin if the device is low on disk or the PWA goes unused for an extended period ([WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)); a queued-but-unflushed write can simply vanish. Mitigate by flushing eagerly and keeping the queue tiny/short-lived rather than relying on persistence. Separately, use Serwist, not next-pwa, for the service worker — next-pwa is archived/webpack-only and conflicts with Next.js 16's Turbopack default ([Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)).

**Verdict:** worth doing now — the queue+idempotent-ID design is small and reliable; skip any conflict-resolution machinery beyond timestamp-wins, it's not needed for this usage pattern.

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

**Recommendation: keep R1, R1c and R2 exactly as written; don't add streak gamification or a generic daily push notification.** Spend the effort on making the app fast to get back to (home-screen icon, instant load). If a reminder is ever added, make it one conditional evening nudge ("nothing logged yet today"), not a fixed daily alarm.

**Logging frequency is what matters, not completeness.** Burke et al.'s systematic review found a consistent dose-response link between how often people self-monitor and weight lost — mostly observational studies, so moderate strength ([Burke 2011](https://www.jandonline.org/article/s0002-8223(10)01644-5/abstract)). Daily self-weighing has RCT support ([Steinberg 2013](https://onlinelibrary.wiley.com/doi/full/10.1002/oby.20396)), and all 17 studies in a later review tied more frequent weighing to better loss or maintenance ([Zheng 2015](https://onlinelibrary.wiley.com/doi/full/10.1002/oby.20946)). This backs R1's "any entry counts, no bar to clear" and R4's daily weigh-in.

**Streaks: the risk is real, the popular numbers aren't.** The "what-the-hell effect" is well replicated in the restrained-eating literature: a dieter who believes a rule is broken tends to abandon control for the rest of the day and plan to "start clean" tomorrow ([Herman & Polivy, overview](https://en.wikipedia.org/wiki/Counterregulatory_eating)). A lapse framed as recoverable is less likely to cascade than one framed as a reset to zero (Marlatt & Gordon's abstinence-violation effect). Lally et al. found habits took a median ~66 days to form (range 18–254), and **missing a single occasion didn't measurably disrupt habit formation** ([Lally 2010](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674)) — consolidation comes from average repetition, not an unbroken chain. Figures circulating online — a "2020 CHI paper" showing 63% higher abandonment with streaks, or 87%/41%/12% missed-day drop-off — couldn't be traced to any primary source and look like habit-app blogs citing each other. Treat them as unverified.

That supports the current rules: R2 never shows a demoralising 0 before today is logged, so there's no cliff edge each morning, and R1c makes a missed day a fixable gap rather than a permanent reset.

**Reminders: thinner, mixed evidence.** A micro-randomized trial found notifications raise same-day engagement, but the effect varies by context and fades with repetition ([JMIR mHealth 2023](https://mhealth.jmir.org/2023/1/e38342)); generic frequent alerts drive dismissal and uninstalls. Nothing strong shows a fixed daily reminder builds a durable habit — Lally's model points to a stable cue (always log right after dinner) instead. The prototype failed because it was hard to get back to, not because of forgetting, so the evidence points to reducing friction over reminding harder.

**Verdict:** rules stand as written. A single conditional evening nudge is a cheap "later, maybe" (a couple of hours). Don't build notification infrastructure or streak-milestone UI.
