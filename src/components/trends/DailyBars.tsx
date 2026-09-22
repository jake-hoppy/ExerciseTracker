import type { StatRow } from "@/lib/stats";
import { formatGrams, formatKcal, formatShortDate } from "@/lib/format";
import { DESKTOP, PHONE, ticks, tickIndexes, xScale, yScale, type Layout } from "./scale";

// One column per day against the flat target line (rule R6b). An unlogged
// day has no column — empty is not zero (rule R6). Over target simply rises
// past the line; nothing changes colour (never scold).
export function DailyBars({
  rows,
  field,
  target,
  unit,
}: {
  rows: StatRow[];
  field: "calories" | "protein";
  target: number | null;
  unit: "kcal" | "g";
}) {
  const values = rows.map((r) => r[field]);
  const real = values.filter((v): v is number => v !== null);
  if (real.length === 0) {
    return <p className="font-mono text-sm text-ink-faint">Nothing logged in this range.</p>;
  }
  const max = Math.max(...real, target ?? 0) * 1.08;
  const fmt = unit === "kcal" ? formatKcal : formatGrams;
  const label = field === "calories" ? "Calories per day against target" : "Protein per day against target";
  const props = { rows, values, target, max, fmt, label };
  return (
    <>
      <Drawing layout={{ ...PHONE, height: 150 }} className="sm:hidden" {...props} />
      <Drawing layout={{ ...DESKTOP, height: 190 }} className="hidden sm:block" {...props} />
    </>
  );
}

function Drawing({
  layout: l,
  className,
  rows,
  values,
  target,
  max,
  fmt,
  label,
}: {
  layout: Layout;
  className: string;
  rows: StatRow[];
  values: (number | null)[];
  target: number | null;
  max: number;
  fmt: (v: number | null) => string;
  label: string;
}) {
  const n = rows.length;
  const x = xScale(n, l);
  const y = yScale(0, max, l);
  const slot = (l.width - l.left - l.right) / Math.max(n, 1);
  const bar = Math.min(24, Math.max(3, slot - 2));
  const y0 = y(0);

  return (
    <svg viewBox={`0 0 ${l.width} ${l.height}`} width="100%" role="img" aria-label={label} className={className} fontFamily="var(--font-mono)" fontSize={l.font}>
      {ticks(0, max, 2)
        .filter((t) => t > 0)
        .map((t) => (
          <g key={t}>
            <line x1={l.left} x2={l.width - l.right} y1={y(t)} y2={y(t)} stroke="var(--color-line-soft)" strokeWidth={1} />
            <text x={l.left - 6} y={y(t) + 4} textAnchor="end" fill="var(--color-ink-faint)">
              {fmt(t)}
            </text>
          </g>
        ))}
      {values.map((v, i) => {
        if (v === null) return null;
        const h = Math.max(0, y0 - y(v));
        const r = Math.min(4, h / 2);
        const cx = x(i);
        return (
          <path
            key={i}
            d={`M${(cx - bar / 2).toFixed(1)},${y0} v${(-h + r).toFixed(1)} a${r},${r} 0 0 1 ${r},-${r} h${(bar - 2 * r).toFixed(1)} a${r},${r} 0 0 1 ${r},${r} v${(h - r).toFixed(1)} z`}
            fill="var(--color-moss-dim)"
          >
            <title>{`${formatShortDate(rows[i].date)}: ${fmt(v)}`}</title>
          </path>
        );
      })}
      {target !== null && (
        <g>
          <line x1={l.left} x2={l.width - l.right} y1={y(target)} y2={y(target)} stroke="var(--color-rust)" strokeWidth={1.5} />
          {/* The label lives above the plot where no column can reach it;
              the y scale leaves 8% headroom above the tallest value. */}
          <line x1={l.width - l.right - 14} x2={l.width - l.right} y1={l.top + 2} y2={l.top + 2} stroke="var(--color-rust)" strokeWidth={1.5} />
          <text x={l.width - l.right - 18} y={l.top + 6} textAnchor="end" fill="var(--color-ink-dim)">
            target {fmt(target)}
          </text>
        </g>
      )}
      <line x1={l.left} x2={l.width - l.right} y1={y0} y2={y0} stroke="var(--color-line)" strokeWidth={1} />
      {tickIndexes(n, l.xTicks).map((i) => (
        <text key={i} x={x(i)} y={l.height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fill="var(--color-ink-faint)">
          {formatShortDate(rows[i].date)}
        </text>
      ))}
    </svg>
  );
}
