import { formatGrams, formatKcal } from "@/lib/format";
import { remaining, type Remaining as RemainingValue, type Totals } from "@/lib/totals";
import { Tally } from "./Tally";

type Targets = { calTarget: number | null; proteinTarget: number | null };

// Remaining leads; totals report (docs/09-design-brief.md). Two ledger lines,
// each a large figure over its tick tally, with the running total underneath
// in small type. Over target is stated in --over and nothing else changes —
// never scold.
export function Remaining({ totals, targets }: { totals: Totals; targets: Targets }) {
  return (
    <section aria-label="Remaining today" className="space-y-6">
      <Line
        r={remaining(totals.calories, targets.calTarget)}
        total={totals.calories}
        target={targets.calTarget}
        format={formatKcal}
        unit=""
        lead
        verb="kcal left"
        overVerb="kcal over"
        label="Calories"
      />
      <Line
        r={remaining(totals.protein, targets.proteinTarget)}
        total={totals.protein}
        target={targets.proteinTarget}
        format={formatGrams}
        unit="g"
        verb="protein to go"
        overVerb="protein over"
        label="Protein"
      />
    </section>
  );
}

function Line({
  r,
  total,
  target,
  format,
  unit,
  verb,
  overVerb,
  label,
  lead = false,
}: {
  r: RemainingValue;
  total: number | null;
  target: number | null;
  format: (v: number | null) => string;
  unit: string;
  verb: string;
  overVerb: string;
  label: string;
  lead?: boolean;
}) {
  const over = r.kind === "over";
  // No target: the total is all there is to say, so it becomes the figure.
  const figure = r.kind === "none" ? format(total) : format(r.amount);
  const caption = r.kind === "none" ? `${label.toLowerCase()} logged` : over ? overVerb : verb;

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2.5">
        <span className={over ? "text-over" : "text-chalk"}>
          <span
            className={`font-mono leading-none font-medium tracking-tight tabular-nums ${
              lead ? "text-[56px] sm:text-[68px]" : "text-[40px] sm:text-5xl"
            }`}
          >
            {figure}
          </span>
          {unit && (
            <span className={`ml-1 font-mono leading-none ${lead ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>{unit}</span>
          )}
        </span>
        <span className="text-[15px] text-chalk-2">{caption}</span>
      </p>
      {target !== null && (
        <>
          <Tally total={total} target={target} label={label} />
          <p className="mt-1.5 font-mono text-xs text-chalk-3 tabular-nums">
            {format(total ?? 0)} of {format(target)}
          </p>
        </>
      )}
    </div>
  );
}
