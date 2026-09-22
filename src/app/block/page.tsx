import { connection } from "next/server";
import { db } from "@/lib/db";
import { eachDate, today } from "@/lib/dates";
import { blocksCovering, targetsFor, workoutTypeIdFor } from "@/lib/schedule";
import { dayTotals } from "@/lib/totals";
import {
  formatGrams,
  formatKcal,
  formatShortDate,
  formatWeekday,
  formatWeight,
} from "@/lib/format";

async function getLog() {
  const [settings, types, blocks, days] = await Promise.all([
    db.settings.findUnique({ where: { id: "singleton" } }),
    db.workoutType.findMany(),
    db.block.findMany(),
    db.day.findMany({
      orderBy: { date: "desc" },
      include: { entries: { select: { calories: true, protein: true } } },
    }),
  ]);
  return { settings, types, blocks, days };
}

export default async function BlockPage() {
  await connection();
  const { settings, types, blocks, days } = await getLog();

  if (!settings) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-ink-dim">
          No schedule yet. Seed one with <code className="font-mono">npm run db:seed</code>.
        </p>
      </main>
    );
  }

  const date = today();
  const typeById = new Map(types.map((t) => [t.id, t]));
  const sessionFor = (d: string, override: string | null) =>
    typeById.get(workoutTypeIdFor(d, settings, override));

  // Every date from the first Day through today is listed, logged or not
  // (R1b, R1c): a hidden gap reads as "nothing happened" when it means
  // "not logged yet". Days are newest first, so the oldest is last.
  const byDate = new Map(days.map((d) => [d.date, d]));
  const first = days.at(-1)?.date ?? date;
  const last = days[0]?.date ?? date;
  const rows = eachDate(first < date ? first : date, last > date ? last : date)
    .reverse()
    .map(
      (d) =>
        byDate.get(d) ?? { id: d, date: d, workoutTypeId: null, weight: null, notes: null, entries: [] },
    );

  const session = sessionFor(date, days.find((d) => d.date === date)?.workoutTypeId ?? null);
  const targets = targetsFor(date, blocks, settings);
  const block = blocksCovering(date, blocks)[0];

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-16">
      <header className="mb-6">
        <p className="label">
          Today · {formatWeekday(date)} {formatShortDate(date)}
          {block && <> · {block.name}</>}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-wide text-parchment uppercase">
          {session?.name ?? "—"}
        </h1>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line-soft">
          <Stat label="Calories" value={formatKcal(targets.calTarget)} unit="kcal" />
          <Stat label="Protein" value={formatGrams(targets.proteinTarget)} unit="g" />
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
        {rows.map((day) => {
          const totals = dayTotals(day.entries);
          const logged = day.entries.length > 0;
          const workout = sessionFor(day.date, day.workoutTypeId);
          const isRest = workout?.isRest ?? false;
          const border = day.date === date
            ? "border-l-rust"
            : logged
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
                  {workout?.name ?? "—"}
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
