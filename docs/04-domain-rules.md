# Domain rules

**Binding.** These came out of a month of real use. Several are deliberately
counterintuitive and were chosen over the obvious alternative. Changing one is
a product decision — raise it, don't refactor it away.

Every rule here gets a unit test with hand-checked expected values.

---

## R1. A day is logged, or it isn't

**A day counts when it has at least one food entry.** That is the entire
definition. The numbers are the record — there is no separate box to tick
saying you logged the thing you just logged.

There is **no rest-day exception**. You eat on rest days; the question "did
you log today?" applies identically to all 30 days.

An earlier design gated completion on three checkboxes (`workoutDone`,
`foodLogged`, `proteinHit`). Those are gone. Don't reintroduce them: a
checkbox next to the data it describes is ceremony, and it made a day with
real data look incomplete.

Hitting the target is **not** part of this. A day where you logged 2,800
against a 2,100 target is a logged day. The streak measures whether you're
tracking, not whether you were good.

## R1b. Days are created when logged

There is no pre-generated calendar and no "active block". A `Day` row comes
into existence the first time something is logged on that date, and any date
is always available — past, today, or a year from now.

The day's session is **computed**, not stored:
`pattern[daysBetween(Settings.anchorDate, date) % pattern.length]` in cycle
mode, or day-of-week in weekly mode. `Day.workoutTypeId`, when set, overrides
it for that one day.

Never write code that asks "which block is this day in?" as a precondition for
logging. Blocks are optional labels over date ranges (decision D4) and a day
belonging to none is the normal case.

## R1c. Any past date can be backfilled

Any past date must be reachable and loggable. Forgetting to log a day is
normal; the app must let you fill it in later, whether that's the next morning
or three weeks on. **This is a hard requirement, not a nice-to-have.**

- The Today screen offers date navigation — previous/next day, plus a date
  picker for jumping further back.
- Unlogged past days are visible in the day list, shown as unlogged rather
  than hidden. A silent gap reads as "nothing happened"; a visible one reads
  as "you didn't log this."
- Logging into a past date creates its `Day` row exactly as today does (R1b).
  No special case, no "this day is closed" state.
- Backfilling repairs the streak automatically — R2 recomputes from logged
  days, so filling yesterday in today restores the run. Nothing special is
  needed for this, but don't write code that prevents it.

Future dates are reachable too, but not a priority.

## R2. Current streak

Walk backward from today counting consecutive logged days. Stop at the first
unlogged one.

**If today isn't logged yet, skip it and start from yesterday.** A streak that
reads 0 every morning before breakfast is demoralising and carries no
information. Today can only ever add to the streak, never subtract from it.

## R3. Longest streak

Scans the whole block independently of today, so it still reports a run that
ended two weeks ago.

## R4. Weight — the rolling average is the number

**Every user-facing weight figure leads with the 7-day rolling average, not
the most recent reading.** Single-day weight swings 2–3 lbs on sodium, carbs,
and gut contents. A raw daily number is noise presented as signal.

- Raw daily readings render as a thin line with small dots.
- The 7-day trailing average renders as the thick, prominent line.
- The headline delta ("−2.4 lbs") is computed from the average, and states
  its window when the window is short: "on the 4-day average".
- The average is trailing over the last 7 *calendar* days of readings, not the
  last 7 entries — missed days must not silently widen the window.

If the block has a `startWeight` and day 1 has no reading, anchor the series
at day 1 with the start weight so the line has an origin. A real day-1 reading
supersedes the anchor; never render both.

## R5. Counts are derived, never hardcoded

Training-day totals, rest-day totals, and block length come from the schedule.
The prototype hardcoded "26 training days" when the real number was 22, which
made the progress counter permanently unreachable.

## R6. Empty is not zero

A day with no logged calories is not a zero-calorie day. `null` is excluded
from averages entirely — it must not drag the mean down.

## R6b. Targets are flat across all days

One calorie target and one protein target, compared against every day
identically — training days and rest days alike.

Resolution order: a `Block` covering the date that sets targets → `Settings`
defaults → no target shown. Never a hardcoded number, and never a per-day-type
target.

A two-tier target (higher on training days) was proposed and **deliberately
rejected**; see decision D7. Adherence to one number beats optimisation across
two. Don't reintroduce it as an option or a toggle.

## R6c. Day totals derive from entries

`Day.calories` and `Day.protein` are **never stored**. They are the sum of
that day's `Entry` rows, computed on read.

Everything logged is an `Entry` — a saved item, or a quick untitled one
carrying just a number. There is no second path and no manual override field;
"I ate roughly 800 at dinner" is an untitled entry of 800, not a special case.
One mechanism means one place for the arithmetic to be wrong.

A day with no entries has `null` totals, not `0` — see R6.

## R7. Dates are calendar dates

Never timestamps, never UTC-converted for display. A weigh-in logged at 6am
Mountain must land on that calendar day, always.

## R8. Known-noisy days

After an unusually hard effort — a long hike, a race — weight commonly jumps
2–4 lbs from inflammation and glycogen resupply, peaking 24–48 hours later. It
is not fat and it clears in a few days.

If a day is flagged as unusual, the raw point still plots, but consider
annotating it rather than letting it silently distort a short rolling window.
An unexplained spike causes people to cut calories exactly when they shouldn't.

---

## Reference values

For sanity checks and any estimator in the app. Mifflin-St Jeor:

```
BMR = (10 × kg) + (6.25 × cm) − (5 × age) + 5     [male]
```

Activity multipliers used previously: rest ~1.23, lift only ~1.40,
lift + run ~1.54, lift + run + hard labour ~1.68.

A sustainable cut runs 400–600 below maintenance — roughly a pound a week.
Faster than that, at a trained bodyweight, usually means losing muscle too.
If the app ever suggests a target, it should not suggest a deficit above 750.
