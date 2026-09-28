"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setTrainedAction } from "@/app/actions";
import { SaveError } from "./SaveError";

// One ≥44px boxed word, like a stamp on the page. Set means chalk-bright on a
// solid rule — brightness is how this design encodes "done", so it needs no
// colour of its own. Not a checkbox beside text (docs/09-design-brief.md).
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
          compact
            ? "flex w-11 items-center justify-center text-base"
            : "px-3 text-[10.5px] tracking-[0.14em] uppercase"
        } ${
          optimistic
            ? "border-chalk bg-chalk/15 text-chalk"
            : compact
              ? "border-rule-soft text-chalk-3 hover:border-chalk-3"
              : "border-rule text-chalk-3 hover:border-chalk-3 hover:text-chalk-2"
        }`}
      >
        {compact ? (optimistic ? "✓" : "") : "Trained"}
      </button>
      {failed && <SaveError onRetry={toggle} />}
    </div>
  );
}
