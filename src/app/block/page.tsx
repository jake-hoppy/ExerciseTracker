import Link from "next/link";
import { connection } from "next/server";
import { TrainedToggle } from "@/components/day/TrainedToggle";
import { WeightField } from "@/components/day/WeightField";
import { loadBlockScreen } from "@/lib/block-screen";
import { formatGrams, formatKcal, formatShortDate, formatWeekday } from "@/lib/format";
import { routeFor } from "@/lib/routes";

// Every day, grouped by month, newest first. Weight and trained edit in
// place; the date opens the day for entries and notes. Unlogged days are
// rows like any other (rule R1c).
export default async function BlockPage() {
  await connection();
  const groups = await loadBlockScreen();

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <nav className="flex min-h-11 items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-ink">Every day</h1>
        <Link href="/" className="flex min-h-11 items-center font-mono text-sm text-ink-dim">
          Today ›
        </Link>
      </nav>

      <div className="mb-1 grid grid-cols-[3.5rem_minmax(0,1fr)_3.25rem_3rem_2.25rem_2.75rem] gap-x-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_4rem_3.5rem_3rem_2.75rem] sm:gap-x-3 items-center px-0 pt-4">
        <span className="label">Day</span>
        <span className="label">Session</span>
        <span className="label text-right">Wt</span>
        <span className="label text-right">Kcal</span>
        <span className="label text-right">Prot</span>
        <span />
      </div>

      {groups.map((g) => (
        <section key={g.label} aria-label={g.label} className="mb-6">
          <p className="label border-b border-line-soft py-2">{g.label}</p>
          <ul className="divide-y divide-line-soft border-b border-line-soft">
            {g.rows.map((r) => (
              <li
                key={r.date}
                className={`grid min-h-11 grid-cols-[3.5rem_minmax(0,1fr)_3.25rem_3rem_2.25rem_2.75rem] gap-x-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_4rem_3.5rem_3rem_2.75rem] sm:gap-x-3 items-center border-l-2 pl-1.5 ${
                  r.logged ? "border-l-moss" : r.isRest ? "border-l-ink-faint" : "border-l-transparent"
                }`}
              >
                <Link
                  href={routeFor(r.date)}
                  className="flex min-h-11 flex-col justify-center font-mono leading-tight"
                >
                  <span className="text-[10.5px] tracking-widest text-ink-faint uppercase">
                    {formatWeekday(r.date)}
                  </span>
                  <span className="text-sm text-ink">{formatShortDate(r.date)}</span>
                </Link>
                <span
                  className={`truncate font-display text-[15px] leading-tight font-medium tracking-wide ${
                    r.isRest ? "text-ink-dim" : "text-ink"
                  }`}
                >
                  {r.sessionName ?? "—"}
                </span>
                <WeightField date={r.date} weight={r.weight} avg={null} compact />
                <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
                  {formatKcal(r.totals.calories)}
                </span>
                <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
                  {formatGrams(r.totals.protein)}
                </span>
                <TrainedToggle date={r.date} trained={r.trained} compact />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
