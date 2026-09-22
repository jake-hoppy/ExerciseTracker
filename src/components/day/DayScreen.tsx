import { loadDayScreen } from "@/lib/day-screen";
import { formatGrams, formatKcal } from "@/lib/format";
import { dayTotals } from "@/lib/totals";
import { DateNav } from "./DateNav";
import { ROW_GRID } from "./grid";
import { NotesField } from "./NotesField";
import { Remaining } from "./Remaining";
import { TrainedToggle } from "./TrainedToggle";
import { WeightField } from "./WeightField";

export async function DayScreen({ date }: { date: string }) {
  const data = await loadDayScreen(date);
  const totals = dayTotals(data.entries);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <header
        className={`border-l-2 pl-3 ${data.isToday ? "border-l-rust" : "border-l-line"}`}
      >
        <DateNav date={date} isToday={data.isToday} blockName={data.blockName} />

        <div className="flex items-center justify-between gap-4">
          <h1
            className={`font-display text-3xl font-semibold tracking-wide ${
              data.isRest ? "text-ink-dim" : "text-ink"
            }`}
          >
            {data.sessionName ?? "—"}
          </h1>
          <TrainedToggle date={date} trained={data.day?.trained ?? false} />
        </div>

        <Remaining totals={totals} targets={data.targets} />

        <WeightField date={date} weight={data.day?.weight ?? null} avg={data.weightAvg} />
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

      <NotesField date={date} notes={data.day?.notes ?? null} />
    </main>
  );
}
