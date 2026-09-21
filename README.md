# Training tracker

Personal training and nutrition tracker. Logs daily workouts, calories,
protein and bodyweight across fixed-length training blocks, and shows whether
the block is working.

Replaces a single-file HTML prototype that ran one complete 30-day block
(Aug 13 – Sep 11, 2026).

## Start here

```
CLAUDE.md                          How Claude Code should work in this repo
docs/01-architecture-decisions.md  Open decisions — resolve these first
docs/02-roadmap.md                 Phases, and what's deliberately excluded
docs/03-design-system.md           Colors, type, layout rules
docs/04-domain-rules.md            Binding behaviour — streaks, averages, dates
docs/05-research-brief.md          Integration questions to investigate
docs/06-pin-lock.md                PIN gate spec (Phase 2)
docs/07-food-log.md                Saved-items food log — the core feature
docs/08-autonomous-run.md          How to hand this to Claude Code and walk away
docs/09-design-brief.md            Input for /superpowers:brainstorm + frontend-design
data/seed-block.json               The completed block's schedule
```

## First session

D1, D3, D4, D4b, D5 and D7 are settled. D2 is open and doesn't block Phases 1–3.

1. Create a Neon database, write `.env.local` (see `docs/08-autonomous-run.md`)
2. Either `/start-phase 1` to work through it interactively, or follow
   `docs/08-autonomous-run.md` to hand it off and walk away.

## Tooling

Subagents in `.claude/agents/`:

- `ui-reviewer` — critiques a rendered screen against the design system
- `rules-auditor` — audits stats and date logic against the domain rules
- `researcher` — investigates one research-brief question and recommends

Commands in `.claude/commands/`:

- `/verify-ui [route]` — screenshot, review, fix, repeat
- `/start-phase [n]` — read the docs, plan, build, verify

## Prototype data

The prototype stored entries in browser storage and the export may be
unrecoverable. `data/seed-block.json` carries the schedule and targets with
logged values left null. If an export turns up, its shape is documented in
the import section of the earlier build spec and maps straight onto these
fields.
