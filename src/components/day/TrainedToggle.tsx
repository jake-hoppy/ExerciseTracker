"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setTrainedAction } from "@/app/actions";
import { SaveError } from "./SaveError";

// One ≥44px boxed word, like a stamp on the page: moss when set. Not a
// checkbox beside text (docs/09-design-brief.md: no ceremony).
export function TrainedToggle({
  date,
  trained,
  compact = false,
}: {
  date: string;
  trained: boolean;
  // The block view's rows: a 44px square showing only the tick.
  compact?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(trained);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const toggle = () =>
    startTransition(async () => {
      const next = !optimistic;
      setOptimistic(next);
      setFailed(false);
      try {
        await setTrainedAction(date, next);
      } catch {
        setFailed(true);
      }
    });

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={optimistic}
        aria-label={compact ? "Trained" : undefined}
        className={`min-h-11 rounded-card border font-mono transition-colors duration-150 ${
          compact ? "flex w-11 items-center justify-center text-base" : "px-3 text-xs tracking-wider uppercase"
        } ${optimistic ? "border-moss bg-moss/15 text-moss" : "border-line text-ink-dim"}`}
      >
        {compact ? (optimistic ? "✓" : "") : optimistic ? "Trained ✓" : "Trained"}
      </button>
      {failed && <SaveError onRetry={toggle} />}
    </div>
  );
}
