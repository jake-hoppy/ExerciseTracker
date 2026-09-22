"use client";

import { useState } from "react";
import { formatGrams, formatKcal } from "@/lib/format";
import type { OptimisticEntry } from "./DayLog";
import { ROW_GRID } from "./grid";

// Tap the row to edit its numbers in place — this entry only, never the
// saved item. ✕ removes it. Both targets ≥ 44px.
export function EntryRow({
  entry,
  onEdit,
  onRemove,
}: {
  entry: OptimisticEntry;
  onEdit: (id: string, numbers: { calories: number; protein: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cal, setCal] = useState(String(entry.calories));
  const [prot, setProt] = useState(String(entry.protein));
  const [invalid, setInvalid] = useState(false);
  const label = entry.name ?? "Quick add";

  const done = () => {
    const c = Number(cal);
    const p = Number(prot);
    const ok =
      Number.isInteger(c) && c >= 0 && c <= 5000 && Number.isInteger(p) && p >= 0 && p <= 500;
    if (!ok) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setEditing(false);
    if (c !== entry.calories || p !== entry.protein) onEdit(entry.id, { calories: c, protein: p });
  };

  const numberField = (value: string, set: (v: string) => void, name: string) => (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => set(e.target.value)}
      aria-label={name}
      className={`w-full min-w-0 rounded-card border bg-bg-alt px-1 py-1 text-right font-mono text-sm text-ink ${
        invalid ? "border-rust" : "border-line"
      }`}
    />
  );

  if (editing) {
    return (
      <li className={`${ROW_GRID} min-h-11 py-1`}>
        <span className="font-mono text-moss">✓</span>
        <span className="line-clamp-2 font-serif leading-tight text-ink">{label}</span>
        {numberField(cal, setCal, "Calories")}
        {numberField(prot, setProt, "Protein grams")}
        <button
          type="button"
          onClick={done}
          className="flex min-h-11 items-center justify-center font-mono text-xs tracking-wider text-moss uppercase"
        >
          Done
        </button>
      </li>
    );
  }

  return (
    <li className={`${ROW_GRID} min-h-11 ${entry.pending ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={entry.pending}
        aria-label={`Edit ${label}`}
        className="col-span-4 grid min-h-11 grid-cols-subgrid items-center text-left"
      >
        <span className="font-mono text-moss">✓</span>
        <span className="line-clamp-2 py-1.5 font-serif leading-tight text-ink">{label}</span>
        <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
          {formatKcal(entry.calories)}
        </span>
        <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
          {formatGrams(entry.protein)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        disabled={entry.pending}
        aria-label={`Remove ${label}`}
        className="flex min-h-11 min-w-11 items-center justify-center font-mono text-ink-faint"
      >
        ✕
      </button>
    </li>
  );
}
