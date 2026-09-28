import Link from "next/link";
import { connection } from "next/server";
import { DailyBars } from "@/components/trends/DailyBars";
import { StatTile } from "@/components/trends/StatTile";
import { WeightChart } from "@/components/trends/WeightChart";
import { formatDateRange, formatGrams, formatKcal, formatWeight } from "@/lib/format";
import { loadTrends } from "@/lib/trends";

// Answers "is this block working?" without arithmetic: the weight delta on
// the rolling average leads (rule R4), then adherence, then the charts.
export default async function TrendsPage() {
  await connection();
  const t = await loadTrends();
  const { stats, targets } = t;
  const c = stats.completion;
  const delta = stats.delta;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <nav className="flex min-h-11 items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl leading-tight font-bold tracking-tight text-chalk">
            {t.block?.name ?? "Last 30 days"}
          </h1>
          <p className="mt-0.5 font-mono text-[13px] text-chalk-3">
            {formatDateRange(t.range.start, t.range.end)}
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 font-mono text-sm text-chalk-2 transition-colors duration-150 hover:text-chalk"
        >
          Today
        </Link>
      </nav>

      <section
        aria-label="Summary"
        className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4"
      >
        <StatTile
          lead
          label="Weight change"
          value={delta ? `${delta.delta > 0 ? "+" : ""}${formatWeight(delta.delta)}` : "—"}
          unit={delta ? "lb" : undefined}
          note={delta ? `on the ${delta.window}-day average` : "needs two weigh-ins"}
        />
        <StatTile
          label="Current streak"
          value={String(stats.currentStreak)}
          unit={stats.currentStreak === 1 ? "day" : "days"}
        />
        <StatTile
          label="Longest streak"
          value={String(stats.longestStreak)}
          unit={stats.longestStreak === 1 ? "day" : "days"}
        />
        <StatTile label="Logged" value={`${c.loggedDays} of ${c.totalDays}`} unit="days" />
        <StatTile
          label="Trained"
          value={String(c.trainedDays)}
          unit="sessions"
          note={`${c.trainingDays} scheduled`}
        />
        <StatTile
          label="Average calories"
          value={formatKcal(stats.avgCalories === null ? null : Math.round(stats.avgCalories))}
          unit="kcal"
          note={targets.calTarget !== null ? `target ${formatKcal(targets.calTarget)}` : undefined}
        />
        <StatTile
          label="Average protein"
          value={formatGrams(stats.avgProtein === null ? null : Math.round(stats.avgProtein))}
          unit="g"
          note={targets.proteinTarget !== null ? `target ${formatGrams(targets.proteinTarget)}` : undefined}
        />
      </section>

      <section aria-label="Weight" className="mt-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule-soft pb-2">
          <p className="font-mono text-sm text-chalk">Weight</p>
          <p className="font-mono text-xs text-chalk-3">
            <span className="mr-4">
              <span className="mr-1.5 inline-block h-[3px] w-4 rounded-full bg-chalk align-middle" />
              7-day average
            </span>
            <span>
              <span className="mr-1.5 inline-block h-px w-4 bg-chalk-3 align-middle" />
              daily
            </span>
          </p>
        </div>
        <WeightChart
          rows={t.rows}
          series={t.series}
          anchored={t.anchored}
          goalWeight={t.block?.goalWeight ?? null}
        />
      </section>

      <section aria-label="Calories" className="mt-12">
        <p className="mb-3 border-b border-rule-soft pb-2 font-mono text-sm text-chalk">Calories</p>
        <DailyBars rows={t.rows} field="calories" target={targets.calTarget} unit="kcal" />
      </section>

      <section aria-label="Protein" className="mt-12">
        <p className="mb-3 border-b border-rule-soft pb-2 font-mono text-sm text-chalk">Protein</p>
        <DailyBars rows={t.rows} field="protein" target={targets.proteinTarget} unit="g" />
      </section>

      <nav
        aria-label="More"
        className="mt-12 grid grid-cols-2 divide-x divide-rule-soft border-y border-rule-soft"
      >
        {[
          { href: "/", label: "Today", note: "Log the day" },
          { href: "/block", label: "Every day", note: "Fill in a past day" },
        ].map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex min-h-16 flex-col justify-center gap-0.5 py-3 transition-colors duration-150 hover:bg-board-2 ${
              i === 0 ? "pr-4" : "pl-4"
            }`}
          >
            <span className="font-mono text-sm text-chalk">{l.label}</span>
            <span className="text-xs text-chalk-3">{l.note}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
