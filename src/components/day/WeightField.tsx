"use client";

import { useState, useTransition } from "react";
import { setWeightAction } from "@/app/actions";
import { formatAvgLabel, formatWeight } from "@/lib/format";
import { SaveError } from "./SaveError";

// The 6am target. Tapping the number swaps in a decimal input pre-filled
// with the current value; blur or Enter saves; empty saves null. The average
// leads and the raw reading sits beside it, smaller (rule R4).
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

  // `big` is the unaveraged case: no average yet, so the reading is the
  // headline and the blank is the biggest target on the screen at 6am.
  const reading = (big: boolean) =>
    editing ? (
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
        className={`rounded-card border border-rule bg-slate-2 px-2 py-1 font-mono text-chalk tabular-nums ${
          compact ? "w-full text-right text-sm" : big ? "w-32 text-3xl" : "w-24 text-lg"
        }`}
      />
    ) : (
      <button
        type="button"
        onClick={open}
        aria-label="Edit weight"
        className={`flex min-h-11 font-mono leading-none text-chalk tabular-nums transition-colors duration-150 ${
          compact
            ? "w-full items-center justify-end text-sm"
            : big
              ? "items-end text-3xl"
              : "items-end justify-end text-lg"
        } ${invalid ? "rounded-card outline-2 outline-gold" : ""}`}
      >
        {shown == null ? (
          <span
            aria-hidden
            className={`inline-block border-b-2 border-dashed align-baseline ${
              compact ? "h-4 w-6 border-rule" : big ? "h-8 w-24 border-chalk-3" : "h-6 w-16 border-chalk-3"
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
        <p className="flex min-h-11 items-center font-mono text-sm text-chalk-2 tabular-nums">
          {reading(false)}
        </p>
        {failed !== null && <SaveError onRetry={() => save(failed)} />}
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-rule-soft pt-4">
      {avg ? (
        <div className="flex items-end justify-between gap-6">
          <p>
            <span className="flex min-h-11 items-end font-mono text-3xl leading-none text-chalk tabular-nums">
              {formatWeight(avg.average)}
            </span>
            <span className="label mt-1.5 block">{formatAvgLabel(avg.count)} average, lb</span>
          </p>
          <p className="text-right">
            {reading(false)}
            <span className="label mt-1.5 block">today&apos;s reading</span>
          </p>
        </div>
      ) : (
        <p>
          {reading(true)}
          <span className="label mt-1.5 block">weight this morning, lb</span>
        </p>
      )}
      {failed !== null && <SaveError onRetry={() => save(failed)} />}
    </div>
  );
}
