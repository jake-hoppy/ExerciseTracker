import Link from "next/link";
import { addDays } from "@/lib/dates";
import { loadDayScreen, routeFor } from "@/lib/day-screen";
import {
  formatAvgLabel,
  formatGrams,
  formatKcal,
  formatShortDate,
  formatWeekday,
  formatWeight,
} from "@/lib/format";
import { dayTotals } from "@/lib/totals";
import { ROW_GRID } from "./grid";
import { Remaining } from "./Remaining";

export async function DayScreen({ date }: { date: string }) {
  const data = await loadDayScreen(date);
  const totals = dayTotals(data.entries);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <header
        className={`border-l-2 pl-3 ${data.isToday ? "border-l-rust" : "border-l-line"}`}
      >
        <nav className="flex min-h-11 items-center justify-between" aria-label="Change day">
          <Link
            href={routeFor(addDays(date, -1))}
            className="-ml-3 flex min-h-11 min-w-11 items-center justify-center font-mono text-lg text-ink-dim"
            aria-label="Previous day"
          >
            ‹
          </Link>
          <p className="font-mono text-sm text-ink-dim">
            {formatWeekday(date)} {formatShortDate(date)}
            {data.isToday && " · today"}
            {data.blockName && ` · ${data.blockName}`}
          </p>
          <Link
            href={routeFor(addDays(date, 1))}
            className="flex min-h-11 min-w-11 items-center justify-center font-mono text-lg text-ink-dim"
            aria-label="Next day"
          >
            ›
          </Link>
        </nav>

        <div className="flex items-center justify-between gap-4">
          <h1
            className={`font-display text-3xl font-semibold tracking-wide ${
              data.isRest ? "text-ink-dim" : "text-ink"
            }`}
          >
            {data.sessionName ?? "—"}
          </h1>
          {/* Task 5 replaces this with the Trained toggle */}
          <span className="font-mono text-xs tracking-wider text-ink-dim uppercase">
            {data.day?.trained ? "Trained ✓" : "Trained"}
          </span>
        </div>

        <Remaining totals={totals} targets={data.targets} />

        <p className="mt-3 flex items-baseline gap-3 font-mono text-sm text-ink-dim tabular-nums">
          <span className="label">Weight</span>
          {/* Task 5 replaces this with the WeightField */}
          <span className="text-lg text-ink">{formatWeight(data.day?.weight)}</span>
          {data.weightAvg && (
            <span>
              {formatAvgLabel(data.weightAvg.count)} {formatWeight(data.weightAvg.average)}
            </span>
          )}
        </p>
      </header>

      {data.entries.length > 0 && (
        <section className="mt-8" aria-label="Logged">
          <p className="label mb-1">Logged</p>
          {/* Task 6 replaces this with DayLog */}
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {data.entries.map((e) => (
              <li key={e.id} className={`${ROW_GRID} min-h-11`}>
                <span className="font-mono text-moss">✓</span>
                <span className="truncate font-serif text-ink">{e.name ?? "Quick add"}</span>
                <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
                  {formatKcal(e.calories)}
                </span>
                <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
                  {formatGrams(e.protein)}
                </span>
                <span />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-label="Log">
        <p className="label mb-1">Log</p>
        <ul className="divide-y divide-line-soft border-y border-line-soft">
          {data.topItems.map((i) => (
            <li key={i.id} className={`${ROW_GRID} min-h-11`}>
              <span className="font-mono text-ink-faint">+</span>
              <span className="truncate font-serif text-ink">{i.name}</span>
              <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
                {formatKcal(i.calories)}
              </span>
              <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
                {formatGrams(i.protein)}
              </span>
              <span />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-label="Notes">
        <p className="label mb-1">Notes</p>
        {/* Task 5 replaces this with NotesField */}
        <p className="min-h-11 font-serif text-ink-dim">{data.day?.notes ?? ""}</p>
      </section>
    </main>
  );
}
