# Running unattended

How to hand this repo to Claude Code and walk away.

## What this can and can't finish

**Can, unattended:** scaffold, schema, migrations, seed, the food log, the
Today screen, the block view, stats with tests, the PIN gate, commits along
the way.

**Can't, without you:** creating the Neon database, deploying to Vercel,
choosing the PIN. Those need accounts and credentials.

So the realistic outcome of one long run is **Phases 1–3 built, tested and
running locally, committed to a branch**, with a progress log and a list of
open questions. Not a live URL. Budget ten minutes with the machine afterwards
to deploy.

---

## Before you start — about ten minutes

1. **Create the Neon database.** neon.tech, new project, copy the connection
   string.
2. **Write `.env.local`** in the repo root:
   ```bash
   DATABASE_URL="postgresql://..."
   APP_PIN=1234
   SESSION_SECRET=   # openssl rand -hex 32
   ```
   It's gitignored. Without it the run stalls at the first migration.
3. **Commit and branch.** `git checkout -b autobuild`. Clean state going in
   means anything the run gets wrong is one `git reset` away.
4. **Answer D2 or accept it stays open.** Nothing in Phases 1–3 depends on it,
   but leave a line in the decisions doc saying so, or the run may stop to ask.

---

## Launching it

```bash
git checkout -b autobuild
claude
```

Then paste:

> Read `docs/08-autonomous-run.md` and follow its protocol. Work through
> Phases 1, 2 and 3 from `docs/02-roadmap.md`. I'm away — don't ask me
> questions. Use the stop conditions when you genuinely can't proceed, and
> write everything to `PROGRESS.md` as you go.

On permissions: this needs to run commands without prompting, so it needs a
permissive mode. That's the reason for the branch and the clean commit — a
throwaway branch bounds what an unattended run can cost you.

---

## The protocol

For each phase, in order:

### 1. Read before building
`docs/02-roadmap.md` for scope, `docs/04-domain-rules.md` for anything
touching stats or dates, `docs/03-design-system.md` for UI,
`docs/07-food-log.md` for the food log.

### 2. Plan it
Write the plan into `PROGRESS.md` before writing code. Keep it inside the
phase — a plan that reaches into the next phase is a plan to rewrite.

### 3. Build it

### 4. Verify — this is the part that makes unattended work possible

Run the phase's exit criteria below. **Every one must pass.** Not "mostly" —
the whole point of machine-checkable criteria is that there's no judgment call
to get wrong at 2am with nobody watching.

- Code touching stats, streaks, averages or dates → run the `rules-auditor`
  subagent. Fix everything it finds, re-run, repeat until clean. Cap: 3 rounds.
- UI changed → run `/verify-ui`. Cap: 4 rounds, as that command says.

### 5. Record
Append to `PROGRESS.md`: what got built, what the verifiers found, what you
fixed, anything you decided that the docs didn't cover.

Append to `SUGGESTIONS.md` anything worth doing differently — a better
approach you noticed, a doc that's now wrong, scope that seems misjudged.
**Write it down; don't act on it.** Those are for a human to read on return.

### 6. Commit and move on
Real commit message. Then the next phase. Don't stop for review between
phases — that's what the roadmap normally says, and this run is the exception.

---

## Exit criteria

Checkable. If a command doesn't confirm it, it isn't done.

### Phase 1
- [ ] `npm run build` exits 0
- [ ] `npx prisma migrate dev` applies cleanly from scratch
- [ ] Seed script loads `data/seed-block.json` and the food-item list from
      `docs/07-food-log.md`
- [ ] A query returns 30 days for the seeded block, 22 non-rest
- [ ] `npm run typecheck` and `npm run lint` clean

### Phase 2
- [ ] Today screen renders the current day, or a sensible state when today is
      outside every block
- [ ] Adding a saved food item writes an `Entry` that survives a page reload
- [ ] Logging a repeat meal takes **three taps or fewer** from the Today
      screen — count them and write the count in `PROGRESS.md`
- [ ] Day totals sum from entries and are never stored (rule R6c)
- [ ] Weight and the `trained` tick persist
- [ ] `/verify-ui /` passes at 1280px and 390px
- [ ] No touch target under 44px — verify in the screenshot review
- [ ] PIN gate: an unauthenticated request to `/` redirects to `/unlock`;
      the right PIN sets the cookie; five wrong attempts lock out
- [ ] `APP_PIN` and `SESSION_SECRET` appear nowhere in tracked files
      (`git grep` for both — this one is non-negotiable)

### Phase 3
- [ ] Stats module has unit tests covering R1, R2, R3, R4, R5, R6, R6c
- [ ] Rolling average uses a 7-**calendar-day** window, with a test proving it
      differs from a 7-entry window when days are missing
- [ ] A null-calorie day does not pull the average down — tested
- [ ] Streak test: today unlogged does not break the streak
- [ ] `rules-auditor` returns clean
- [ ] Charts pass `/verify-ui /trends` at both widths
- [ ] All tests, typecheck and lint pass

---

## Stop conditions

Stop, write why in `PROGRESS.md`, and wait. Don't improvise around these.

1. **A credential is missing or wrong** — `DATABASE_URL` absent, a migration
   can't connect. Don't fabricate a fallback or silently switch to SQLite.
2. **A decision doc entry is blank** and the phase depends on it. Don't guess
   an architecture decision and build on it.
3. **The same test fails three times** after three different fixes. Three
   failed attempts means the understanding is wrong, not the code.
4. **`/verify-ui` hits its 4-iteration cap** without converging. The problem is
   the design, not the implementation.
5. **A domain rule seems wrong.** Rules in `docs/04-domain-rules.md` are
   binding and were chosen deliberately over the obvious alternative. If one
   looks incorrect, write it in `SUGGESTIONS.md` and implement it as written.
6. **A fix requires deleting a test** to pass. Never do this unattended.

---

## What to expect on return

- `PROGRESS.md` — what happened, phase by phase
- `SUGGESTIONS.md` — what the run thinks you should reconsider
- A branch with real commits
- Probably one or two stop conditions hit; that's the system working, not
  failing

Read `SUGGESTIONS.md` first. It's the highest-signal thing in the repo after a
long run, because it's the part nobody was there to argue with.
