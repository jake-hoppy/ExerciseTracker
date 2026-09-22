"use client";

import { useState, useTransition } from "react";
import { setWeightAction } from "@/app/actions";
import { formatAvgLabel, formatWeight } from "@/lib/format";
import { SaveError } from "./SaveError";

// The 6am target. Tapping the number swaps in a decimal input pre-filled
// with the current value; blur or Enter saves; empty saves null. The
// trailing average sits beside it because the average leads (rule R4).
export function WeightField({
  date,
  weight,
  avg,
  compact = false,
}: {
  date: string;
  weight: number | null;
  avg: { average: number; count: number } | null;
  // The block view's rows: just the number, no caption, no average.
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState<number | null>(weight);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const open = () => {
    setDraft(shown == null ? "" : String(shown));
    setInvalid(false);
    setEditing(true);
  };

  const save = (raw: string) => {
    setEditing(false);
    const cleaned = raw.trim().replace(",", ".");
    const n = cleaned === "" ? null : Math.round(Number(cleaned) * 10) / 10;
    // Same bounds as weightSchema; an out-of-range number never submits.
    if (n !== null && !(Number.isFinite(n) && n >= 50 && n <= 500)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (n === shown) return; // nothing changed: no write, no Day row
    const previous = shown;
    setShown(n);
    setFailed(null);
    startTransition(async () => {
      try {
        setShown(await setWeightAction(date, raw));
      } catch {
        setShown(previous);
        setFailed(raw);
      }
    });
  };

  // The editable raw reading. In the header it follows the average (rule
  // R4: the average leads); in the block view's rows it is the whole cell.
  const reading = editing ? (
    <input
      autoFocus
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => save(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      aria-label="Weight in pounds"
      className={`rounded-card border border-line bg-bg-alt px-2 py-1 text-ink ${
        compact ? "w-full text-right text-sm" : "w-24 text-lg"
      }`}
    />
  ) : (
    <button
      type="button"
      onClick={open}
      aria-label="Edit weight"
      className={`min-h-11 text-ink ${compact ? "w-full text-right text-sm" : "text-left text-lg"} ${
        invalid ? "rounded-card outline-2 outline-rust" : ""
      }`}
    >
      {shown == null ? (
        // Unset is the 6am state: a blank to fill in, the biggest target
        // in the header (docs/10-today-design.md).
        <span
          aria-hidden
          className={`inline-block border-b-2 border-dashed border-ink-faint align-baseline ${
            compact ? "h-4 w-8" : "h-8 w-20"
          }`}
        />
      ) : (
        formatWeight(shown)
      )}
    </button>
  );

  if (compact) {
    return (
      <div>
        <p className="flex min-h-11 items-center font-mono text-sm text-ink-dim tabular-nums">{reading}</p>
        {failed !== null && <SaveError onRetry={() => save(failed)} />}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="flex min-h-11 flex-wrap items-baseline gap-x-3 font-mono text-sm text-ink-dim tabular-nums">
        <span className="label">Weight</span>
        {avg ? (
          <>
            <span className="text-lg text-ink">{formatWeight(avg.average)}</span>
            <span>{formatAvgLabel(avg.count)} avg</span>
            <span className="flex items-baseline gap-2">
              <span>reading</span>
              {reading}
            </span>
          </>
        ) : (
          reading
        )}
      </p>
      {failed !== null && <SaveError onRetry={() => save(failed)} />}
    </div>
  );
}
