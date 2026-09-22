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
- **Research Q1 vs Q2 disagree on iOS Shortcuts reliability.** Q1 recommends
  a weigh-in Shortcut; Q2 warns time-of-day automations fail silently. A
  note under Q1 reconciles them (run it on tap/unlock, not on a timer), but
  worth a read before building either.
