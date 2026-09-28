// The one bold element on Today: a strip of discrete ticks that fill as the
// day is logged, with a gold notch at the target. Counting marks, not a
// progress bar — it answers "how much room is left" before you read a number.
//
// The strip is wider than the target so there is visible room past the notch
// for a day that runs over. Over-target ticks change colour and nothing else:
// they state the fact, they don't scold (docs/09-design-brief.md).

const NOTCH = 82; // where the target sits, as a percentage of the strip

export function Tally({ total, target, label }: { total: number | null; target: number; label: string }) {
  const used = total ?? 0;
  const pct = Math.min(100, (used / target) * NOTCH);
  const filled = Math.min(pct, NOTCH);
  const over = Math.max(0, pct - NOTCH);

  return (
    <div
      className="tally mt-3"
      role="img"
      aria-label={`${label}: ${used} of ${target}`}
    >
      <span className="tally-layer text-rule" />
      <span
        className="tally-layer text-chalk"
        style={{ clipPath: `inset(0 ${100 - filled}% 0 0)` }}
      />
      {over > 0 && (
        <span
          className="tally-layer text-over"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 ${NOTCH}%)` }}
        />
      )}
      <span className="tally-notch" style={{ left: `${NOTCH}%` }} />
    </div>
  );
}
