---
description: Begin a roadmap phase — read the docs, plan it, confirm scope, then build.
---

Start work on phase: $ARGUMENTS

## Before writing code

1. Read `docs/02-roadmap.md` for this phase's scope and its done-condition.
2. Read `docs/04-domain-rules.md` if the phase touches stats, dates or counts.
3. Read `docs/03-design-system.md` if it touches UI.
4. Check `docs/01-architecture-decisions.md` — if a decision this phase
   depends on is still blank, **stop and ask**. Don't guess an architecture
   decision and build on it.

## Plan

Write a short plan: the files you'll create or change, in order, and where
you'll stop. Show it before building. Keep it to the phase's scope — the
roadmap's phases exist to prevent scope drift, so a plan that reaches into
the next phase is a plan to rewrite.

## Build

Work through the plan. Commit at meaningful checkpoints with real messages.

## Before saying it's done

- Does it meet the phase's done-condition as written in the roadmap?
- UI changed → run `/verify-ui`
- Stats or date logic changed → run the `rules-auditor` subagent
- Tests pass, typecheck passes, lint passes
- Update `CLAUDE.md` if commands or layout changed

Then stop for review. Don't roll into the next phase — the roadmap's
checkpoints exist so each phase gets used before the next one starts.
