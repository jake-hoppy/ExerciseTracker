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
}: {
  date: string;
  weight: number | null;
  avg: { average: number; count: number } | null;
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
    if (cleaned !== "" && !Number.isFinite(Number(cleaned))) {
      setInvalid(true);
      return;
    }
    const previous = shown;
    setShown(cleaned === "" ? null : Math.round(Number(cleaned) * 10) / 10);
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

  return (
    <div className="mt-3">
      <p className="flex min-h-11 items-center gap-3 font-mono text-sm text-ink-dim tabular-nums">
        <span className="label">Weight</span>
        {editing ? (
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
            className="w-24 rounded-card border border-line bg-bg-alt px-2 py-1 text-lg text-ink"
          />
        ) : (
          <button
            type="button"
            onClick={open}
            aria-label="Edit weight"
            className={`min-h-11 min-w-16 text-left text-lg text-ink ${
              invalid ? "rounded-card outline-2 outline-rust" : ""
            }`}
          >
            {formatWeight(shown)}
          </button>
        )}
        {avg && (
          <span>
            {formatAvgLabel(avg.count)} {formatWeight(avg.average)}
          </span>
        )}
      </p>
      {failed !== null && <SaveError onRetry={() => save(failed)} />}
    </div>
  );
}
