# Suggestions

Things the unattended run thinks you should reconsider. Written down, not
acted on. Read this first.

## From before the run started (2026-09-21)

- **`docs/08-autonomous-run.md` Phase 2 exit criterion 1** says "or a
  sensible state when today is outside every block". After the D4 revision
  there is no such state — any date renders. Suggest rewording to "Today
  screen renders any date, with or without a Day row".
- **`docs/02-roadmap.md` Phase 5** still says "background sync". Q5 in the
  research brief found iOS Safari has no Background Sync API; the design is
  an on-open/online flush of a local queue. Suggest rewording so nobody
  builds toward an API that isn't there.
- **Item edit/archive is a `⋯` button, not a long-press.** The approved spec
  says long-press. The plan deviates because long-press has no keyboard
  path and nothing on screen reveals it. If you'd rather have long-press as
  well, it's an addition, not a swap.
## During the Phase 2 run

- **`docs/06-pin-lock.md` is written for `middleware.ts`.** Next 16
  deprecated that name; the gate is `src/proxy.ts` exporting `proxy`,
  same logic. Worth updating the doc so the next reader doesn't create a
  deprecated file. The same doc's `/api/unlock` snippet is what shipped,
  with the rate limiter and constant-time compare pulled into
  `src/lib/pin.ts` so they could be unit tested.
- **The rate limiter keys all localhost traffic as one address** (no
  `x-forwarded-for` in dev), so five wrong PINs from any local test lock
  the dev server's `/api/unlock` for a minute. Fine in production behind
  Vercel's proxy; just something to know when testing locally.
- **Unlock screen: no length hint in the empty field.** The reviewer
  suggested a faint `– – – –` placeholder. Left out because docs/06 says
  one plain input; add it if the 6am you ever hesitates there.
- **Block view edits weight and trained inline; entries and notes go
  through the day page.** The roadmap says "editable inline" without
  saying which fields. Inline entry editing in a dense table would mean
  the whole food sheet per row; the date link is one tap away instead.
  If that's not what you meant by inline, say so.
- **`docs/10-today-design.md` drew the weight line with the raw reading
  leading and the average as a caption — the reverse of rule R4.** The
  rules auditor caught it; the code and the doc now lead with the average
  (`178.7 3-day avg · reading 178.2`). If you'd rather see the raw number
  first on the Today header, that's a product decision against R4, not a
  tweak.
- **Overlapping blocks: which one's targets win?** `targetsFor` resolves
  each field through every covering block, latest-starting first, before
  falling back to Settings — so an inner block that sets only calories
  inherits protein from the outer block, not from Settings. R6b's wording
  ("a Block covering the date that sets targets → Settings") doesn't say
  what happens with two blocks. The test now pins the current behaviour
  with values that can fail. Say if you'd rather the latest block alone
  applies.
- **Research Q1 vs Q2 disagree on iOS Shortcuts reliability.** Q1 recommends
  a weigh-in Shortcut; Q2 warns time-of-day automations fail silently. A
  note under Q1 reconciles them (run it on tap/unlock, not on a timer), but
  worth a read before building either.
