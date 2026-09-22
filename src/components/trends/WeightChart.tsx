import type { AveragePoint, StatRow } from "@/lib/stats";
import { formatShortDate, formatWeight } from "@/lib/format";
import { DESKTOP, PHONE, ticks, tickIndexes, xScale, yScale, type Layout } from "./scale";

// Rule R4 on a chart: raw readings are a thin line with small dots, the
// 7-day average is the prominent line. Start and goal are hairlines.
export function WeightChart({
  rows,
  series,
  startWeight,
  goalWeight,
}: {
  rows: StatRow[];
  series: AveragePoint[];
  startWeight: number | null;
  goalWeight: number | null;
}) {
  const readings = rows.map((r) => r.weight);
  const values = [
    ...readings.filter((v): v is number => v !== null),
    ...series.map((p) => p.average).filter((v): v is number => v !== null),
    ...(startWeight !== null ? [startWeight] : []),
    ...(goalWeight !== null ? [goalWeight] : []),
  ];
  if (values.length === 0) {
    return <p className="font-mono text-sm text-ink-faint">No weigh-ins in this range.</p>;
  }
  const min = Math.floor(Math.min(...values)) - 1;
  const max = Math.ceil(Math.max(...values)) + 1;

  return (
    <>
      <Drawing layout={PHONE} className="sm:hidden" {...{ rows, series, startWeight, goalWeight, min, max }} />
      <Drawing layout={DESKTOP} className="hidden sm:block" {...{ rows, series, startWeight, goalWeight, min, max }} />
    </>
  );
}

function Drawing({
  layout: l,
  className,
  rows,
  series,
  startWeight,
  goalWeight,
  min,
  max,
}: {
  layout: Layout;
  className: string;
  rows: StatRow[];
  series: AveragePoint[];
  startWeight: number | null;
  goalWeight: number | null;
  min: number;
  max: number;
}) {
  const n = rows.length;
  const x = xScale(n, l);
  const y = yScale(min, max, l);
  const rawPts = rows.map((r, i) => (r.weight === null ? null : [x(i), y(r.weight)] as const));
  const avgPts = series.map((p, i) => (p.average === null ? null : [x(i), y(p.average)] as const));
  const path = (pts: (readonly [number, number] | null)[]) =>
    pts
      .map((p, i) => (p === null ? "" : `${i === 0 || pts[i - 1] === null ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`))
      .join(" ");
  const last = [...series].reverse().find((p) => p.average !== null);

  return (
    <svg
      viewBox={`0 0 ${l.width} ${l.height}`}
      width="100%"
      role="img"
      aria-label="Weight: raw daily readings and the 7-day rolling average"
      className={className}
      fontFamily="var(--font-mono)"
      fontSize={l.font}
    >
      {ticks(min, max, 4).map((t) => (
        <g key={t}>
          <line x1={l.left} x2={l.width - l.right} y1={y(t)} y2={y(t)} stroke="var(--color-line-soft)" strokeWidth={1} />
          <text x={l.left - 6} y={y(t) + 4} textAnchor="end" fill="var(--color-ink-faint)">
            {t}
          </text>
        </g>
      ))}
      {startWeight !== null && (
        <g>
          <line x1={l.left} x2={l.width - l.right} y1={y(startWeight)} y2={y(startWeight)} stroke="var(--color-ink-faint)" strokeWidth={1} strokeDasharray="2 3" />
          <text x={l.width - l.right} y={y(startWeight) - 4} textAnchor="end" fill="var(--color-ink-faint)" paintOrder="stroke" stroke="var(--color-bg)" strokeWidth={4}>
            start {formatWeight(startWeight)}
          </text>
        </g>
      )}
      {goalWeight !== null && (
        <g>
          <line x1={l.left} x2={l.width - l.right} y1={y(goalWeight)} y2={y(goalWeight)} stroke="var(--color-rust)" strokeWidth={1} />
          <text x={l.width - l.right} y={y(goalWeight) - 4} textAnchor="end" fill="var(--color-ink-dim)" paintOrder="stroke" stroke="var(--color-bg)" strokeWidth={4}>
            goal {formatWeight(goalWeight)}
          </text>
        </g>
      )}
      <path d={path(rawPts)} fill="none" stroke="var(--color-ink)" strokeWidth={1} strokeOpacity={0.7} strokeLinejoin="round" />
      {rawPts.map((p, i) =>
        p === null ? null : (
          <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill="var(--color-ink)" stroke="var(--color-bg)" strokeWidth={1.5}>
            <title>{`${formatShortDate(rows[i].date)}: ${formatWeight(rows[i].weight)} lb`}</title>
          </circle>
        ),
      )}
      <path d={path(avgPts)} fill="none" stroke="var(--color-moss)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {last && last.average !== null && (
        <text
          x={x(series.indexOf(last)) - 6}
          y={y(last.average) - 8}
          textAnchor="end"
          fill="var(--color-ink)"
          fontWeight={600}
          paintOrder="stroke"
          stroke="var(--color-bg)"
          strokeWidth={4}
        >
          {formatWeight(last.average)}
        </text>
      )}
      {tickIndexes(n, l.xTicks).map((i) => (
        <text key={i} x={x(i)} y={l.height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fill="var(--color-ink-faint)">
          {formatShortDate(rows[i].date)}
        </text>
      ))}
    </svg>
  );
}
