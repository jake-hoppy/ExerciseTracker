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
      <nav className="flex min-h-11 items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-ink">
          {t.block?.name ?? "Last 30 days"}
        </h1>
        <Link href="/" className="flex min-h-11 items-center font-mono text-sm text-ink-dim">
          Today ›
        </Link>
      </nav>
      <p className="font-mono text-sm text-ink-dim">{formatDateRange(t.range.start, t.range.end)}</p>

      <section aria-label="Summary" className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <StatTile
          lead
          label="Weight change"
          value={delta ? `${delta.delta > 0 ? "+" : ""}${formatWeight(delta.delta)}` : "—"}
          unit={delta ? "lb" : undefined}
          note={delta ? `on the ${delta.window}-day average` : "needs two weigh-ins"}
        />
        <StatTile label="Current streak" value={String(stats.currentStreak)} unit={stats.currentStreak === 1 ? "day" : "days"} />
        <StatTile label="Longest streak" value={String(stats.longestStreak)} unit={stats.longestStreak === 1 ? "day" : "days"} />
        <StatTile label="Logged" value={`${c.loggedDays} of ${c.totalDays}`} unit="days" />
        <StatTile label="Trained" value={String(c.trainedDays)} unit="sessions" note={`${c.trainingDays} scheduled`} />
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

      <section aria-label="Weight" className="mt-10">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="label">Weight</p>
          <p className="font-mono text-xs text-ink-faint">
            <span className="mr-3"><span className="mr-1 inline-block h-0.5 w-4 bg-moss align-middle" />7-day average</span>
            <span><span className="mr-1 inline-block h-px w-4 bg-ink align-middle" />daily</span>
          </p>
        </div>
        <WeightChart rows={t.rows} series={t.series} startWeight={t.block?.startWeight ?? null} goalWeight={t.block?.goalWeight ?? null} />
      </section>

      <section aria-label="Calories" className="mt-10">
        <p className="label mb-2">Calories</p>
        <DailyBars rows={t.rows} field="calories" target={targets.calTarget} unit="kcal" />
      </section>

      <section aria-label="Protein" className="mt-10">
        <p className="label mb-2">Protein</p>
        <DailyBars rows={t.rows} field="protein" target={targets.proteinTarget} unit="g" />
      </section>

      <Link href="/block" className="mt-10 flex min-h-11 items-center justify-between border-y border-line-soft font-mono text-sm text-ink-dim">
        <span>Every day</span>
        <span className="pr-1 text-lg">›</span>
      </Link>
    </main>
  );
}
