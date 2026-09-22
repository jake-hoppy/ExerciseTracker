import { formatGrams, formatKcal } from "@/lib/format";
import { remaining, type Remaining as RemainingValue, type Totals } from "@/lib/totals";

type Targets = { calTarget: number | null; proteinTarget: number | null };

// Remaining leads; totals report (docs/09-design-brief.md). Set as a ledger
// sum: two figures, a rule, the totals as a sentence. Over target is stated
// in --danger and nothing else changes — never scold.
export function Remaining({ totals, targets }: { totals: Totals; targets: Targets }) {
  const kcal = remaining(totals.calories, targets.calTarget);
  const prot = remaining(totals.protein, targets.proteinTarget);

  return (
    <section aria-label="Remaining today">
      <p className="flex items-baseline justify-between gap-4">
        <Figure r={kcal} unit="" fallback={formatKcal(totals.calories)} verb="left" />
        <Figure r={prot} unit=" g" fallback={formatGrams(totals.protein)} verb="to go" />
      </p>
      <p className="mt-2 flex justify-between border-t border-line-soft pt-2 font-mono text-sm text-ink-dim tabular-nums">
        <span>
          {formatKcal(totals.calories)} of {formatKcal(targets.calTarget)} kcal
        </span>
        <span>
          {formatGrams(totals.protein)} of {formatGrams(targets.proteinTarget)} g
        </span>
      </p>
    </section>
  );
}

function Figure({
  r,
  unit,
  fallback,
  verb,
}: {
  r: RemainingValue;
  unit: string;
  fallback: string;
  verb: string;
}) {
  const figure = "font-display text-3xl font-semibold tracking-wide tabular-nums";
  if (r.kind === "none") {
    return (
      <span className={`${figure} text-parchment`}>
        {fallback}
        {unit}
      </span>
    );
  }
  const n = unit ? formatGrams(r.amount) : formatKcal(r.amount);
  const over = r.kind === "over";
  return (
    <span className={over ? "text-danger" : "text-parchment"}>
      <span className={figure}>
        {n}
        {unit}
      </span>
      <span className={`ml-1.5 font-mono text-sm ${over ? "" : "text-ink-dim"}`}>
        {over ? "over" : verb}
      </span>
    </span>
  );
}
