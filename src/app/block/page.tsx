import Link from "next/link";
import { connection } from "next/server";
import { TrainedToggle } from "@/components/day/TrainedToggle";
import { WeightField } from "@/components/day/WeightField";
import { loadBlockScreen } from "@/lib/block-screen";
import { formatGrams, formatKcal, formatShortDate, formatWeekday } from "@/lib/format";
import { today } from "@/lib/dates";
import { routeFor } from "@/lib/routes";

// Every day, grouped by month, newest first. Weight and trained edit in
// place; the date opens the day for entries and notes. Unlogged days are
// rows like any other (rule R1c).

// The row's left rule is the state: gold is today, chalk is logged (this
// design encodes "done" as brightness), faint is a scheduled rest day, and a
// day with nothing on it gets no mark at all.
const COLUMNS =
  "grid grid-cols-[3.5rem_minmax(0,1fr)_3.25rem_3rem_2.25rem_2.75rem] gap-x-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_4rem_3.5rem_3rem_2.75rem] sm:gap-x-3 items-center";

export default async function BlockPage() {
  await connection();
  const groups = await loadBlockScreen();
  const now = today();

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <nav className="flex min-h-11 items-baseline justify-between gap-4 border-b border-rule-soft pb-3">
        <h1 className="font-display text-2xl leading-tight font-bold tracking-tight text-chalk">
          Every day
        </h1>
        <span className="flex shrink-0 gap-5">
          <Link
            href="/trends"
            className="font-mono text-sm text-chalk-2 transition-colors duration-150 hover:text-chalk"
          >
            Trends
          </Link>
          <Link
            href="/"
            className="font-mono text-sm text-chalk-2 transition-colors duration-150 hover:text-chalk"
          >
            Today
          </Link>
        </span>
      </nav>

      <div className={`${COLUMNS} mb-1 pt-5 pl-2.5`}>
        <span className="colhead">Day</span>
        <span className="colhead">Session</span>
        <span className="colhead text-right">Wt</span>
        <span className="colhead text-right">Kcal</span>
        <span className="colhead text-right">Prot</span>
        <span className="colhead text-center">Trn</span>
      </div>

      {groups.map((g) => (
        <section key={g.label} aria-label={g.label} className="mb-7">
          <p className="border-y border-rule-soft bg-board-2/60 py-1.5 pl-2.5 font-mono text-[11px] tracking-[0.12em] text-chalk-2 uppercase">
            {g.label}
          </p>
          <ul className="divide-y divide-rule-soft border-b border-rule-soft">
            {g.rows.map((r) => (
              <li
                key={r.date}
                className={`${COLUMNS} min-h-11 border-l-2 pl-2 ${
                  r.date === now
                    ? "border-l-gold"
                    : r.logged
                      ? "border-l-chalk"
                      : r.isRest
                        ? "border-l-rule"
                        : "border-l-transparent"
                }`}
              >
                <Link
                  href={routeFor(r.date)}
                  className="flex min-h-11 flex-col justify-center font-mono leading-tight"
                >
                  <span className="text-[10px] tracking-[0.12em] text-chalk-3 uppercase">
                    {formatWeekday(r.date)}
                  </span>
                  <span className="text-sm text-chalk">{formatShortDate(r.date)}</span>
                </Link>
                <span
                  className={`truncate text-[15px] leading-tight font-medium ${
                    r.isRest ? "text-chalk-3" : "text-chalk"
                  }`}
                >
                  {r.sessionName ?? "—"}
                </span>
                <WeightField date={r.date} weight={r.weight} avg={null} compact />
                <span className="text-right font-mono text-sm text-chalk-2 tabular-nums">
                  {formatKcal(r.totals.calories)}
                </span>
                <span className="text-right font-mono text-sm text-chalk-2 tabular-nums">
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
