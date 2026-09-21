import { connection } from "next/server";
import { db } from "@/lib/db";
import { dayTotals } from "@/lib/totals";
import {
  formatDateRange,
  formatGrams,
  formatKcal,
  formatShortDate,
  formatWeekday,
  formatWeight,
} from "@/lib/format";

async function getLatestBlock() {
  return db.block.findFirst({
    orderBy: { startDate: "desc" },
    include: {
      days: {
        orderBy: { date: "asc" },
        include: {
          workoutType: true,
          entries: { select: { calories: true, protein: true } },
        },
      },
    },
  });
}

export default async function Home() {
  await connection();
  const block = await getLatestBlock();

  if (!block) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-ink-dim">
          No block yet. Seed one with <code className="font-mono">npm run db:seed</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-16">
      <header className="mb-6">
        <p className="label">Block · {block.days.length} days</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-wide text-parchment uppercase">
          {block.name}
        </h1>
        <p className="mt-1 font-mono text-sm text-ink-dim">
          {formatDateRange(block.startDate, block.endDate)}
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line-soft">
          <Stat label="Calories" value={formatKcal(block.calTarget)} unit="kcal" />
          <Stat label="Protein" value={formatGrams(block.proteinTarget)} unit="g" />
          <Stat label="Start" value={formatWeight(block.startWeight)} unit="lb" />
        </dl>
      </header>

      <div className="mb-2 grid grid-cols-[3.5rem_1fr_repeat(3,3.25rem)] gap-x-2 px-3 sm:grid-cols-[4rem_1fr_repeat(3,4.5rem)]">
        <span className="label">Day</span>
        <span className="label">Session</span>
        <span className="label text-right">Wt</span>
        <span className="label text-right">Kcal</span>
        <span className="label text-right">Prot</span>
      </div>

      <ol className="space-y-1.5">
        {block.days.map((day) => {
          const totals = dayTotals(day.entries);
          const logged = day.entries.length > 0;
          const isRest = day.workoutType.isRest;
          const border = logged
            ? "border-l-moss"
            : isRest
              ? "border-l-ink-faint"
              : "border-l-line";

          return (
            <li
              key={day.id}
              className={`grid min-h-11 grid-cols-[3.5rem_1fr_repeat(3,3.25rem)] items-center gap-x-2 rounded-card border-l-2 px-3 py-2 sm:grid-cols-[4rem_1fr_repeat(3,4.5rem)] ${border} ${
                isRest ? "bg-bg-alt" : "bg-surface"
              }`}
            >
              <div className="font-mono leading-tight">
                <div className="text-[10.5px] tracking-widest text-ink-faint uppercase">
                  {formatWeekday(day.date)}
                </div>
                <div className="text-sm text-ink">{formatShortDate(day.date)}</div>
              </div>

              <div className="min-w-0">
                <div
                  className={`truncate font-display text-[15px] font-medium tracking-wide uppercase ${
                    isRest ? "text-ink-dim" : "text-ink"
                  }`}
                >
                  {day.workoutType.name}
                </div>
                {day.notes && (
                  <p className="truncate text-sm text-ink-dim">{day.notes}</p>
                )}
              </div>

              <Num value={formatWeight(day.weight)} />
              <Num value={formatKcal(totals.calories)} />
              <Num value={formatGrams(totals.protein)} />
            </li>
          );
        })}
      </ol>
    </main>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg text-parchment">
        {value}
        <span className="ml-1 text-xs text-ink-faint">{unit}</span>
      </dd>
    </div>
  );
}

function Num({ value }: { value: string }) {
  return (
    <span className="text-right font-mono text-sm text-ink-dim tabular-nums">{value}</span>
  );
}
