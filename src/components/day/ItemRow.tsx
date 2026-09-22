"use client";

import { useState } from "react";
import type { ItemView } from "@/lib/day-screen";
import { formatGrams, formatKcal } from "@/lib/format";
import { ROW_GRID } from "./grid";

// One tap logs it. The row flashes moss for 150ms; no toast. `trailing` is
// an optional slot for the sheet's ⋯ button; it shares the row's last column.
export function ItemRow({
  item,
  onLog,
  trailing,
}: {
  item: ItemView;
  onLog: (item: ItemView) => void;
  trailing?: React.ReactNode;
}) {
  const [flash, setFlash] = useState(false);
  return (
    <li className={`${ROW_GRID} min-h-11 transition-colors duration-150 ${flash ? "bg-moss/15" : ""}`}>
      <button
        type="button"
        onClick={() => {
          setFlash(true);
          setTimeout(() => setFlash(false), 150);
          onLog(item);
        }}
        className="col-span-4 grid min-h-11 grid-cols-subgrid items-center text-left"
      >
        <span className={`font-mono ${flash ? "text-moss" : "text-ink-faint"}`}>+</span>
        <span className="line-clamp-2 py-1.5 font-serif leading-tight text-ink">{item.name}</span>
        <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
          {formatKcal(item.calories)}
        </span>
        <span className="text-right font-mono text-sm text-ink-dim tabular-nums">
          {formatGrams(item.protein)}
        </span>
      </button>
      {trailing ?? <span />}
    </li>
  );
}
