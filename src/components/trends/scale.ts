// Shared chart geometry. Each chart renders twice — a phone layout and a
// desktop layout — because SVG text scales with the viewBox, so one drawing
// can't be legible at both widths (docs/03-design-system.md).

export type Layout = {
  width: number;
  height: number;
  left: number; // gutter for y labels
  right: number;
  top: number;
  bottom: number; // gutter for x labels
  font: number;
  xTicks: number; // how many date labels to show
};

export const PHONE: Layout = { width: 358, height: 200, left: 40, right: 12, top: 12, bottom: 26, font: 11, xTicks: 3 };
export const DESKTOP: Layout = { width: 672, height: 260, left: 48, right: 16, top: 14, bottom: 28, font: 12, xTicks: 6 };

export function xScale(n: number, l: Layout) {
  const inner = l.width - l.left - l.right;
  return (i: number) => (n <= 1 ? l.left + inner / 2 : l.left + (i / (n - 1)) * inner);
}

export function yScale(min: number, max: number, l: Layout) {
  const inner = l.height - l.top - l.bottom;
  const span = max - min || 1;
  return (v: number) => l.top + inner - ((v - min) / span) * inner;
}

/** A few clean tick values inside [min, max]. */
export function ticks(min: number, max: number, count = 3): number[] {
  const span = max - min || 1;
  const rough = span / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? pow;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

/** Evenly spaced indexes for x labels: first, last, and a few between. */
export function tickIndexes(n: number, want: number): number[] {
  if (n <= want) return Array.from({ length: n }, (_, i) => i);
  const out = new Set<number>();
  for (let k = 0; k < want; k++) out.add(Math.round((k / (want - 1)) * (n - 1)));
  return [...out].sort((a, b) => a - b);
}
