"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setTrainedAction } from "@/app/actions";
import { SaveError } from "./SaveError";

// One ≥44px boxed word, like a stamp on the page: moss when set. Not a
// checkbox beside text (docs/09-design-brief.md: no ceremony).
export function TrainedToggle({ date, trained }: { date: string; trained: boolean }) {
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
        className={`min-h-11 rounded-card border px-3 font-mono text-xs tracking-wider uppercase transition-colors duration-150 ${
          optimistic ? "border-moss bg-moss/15 text-moss" : "border-line text-ink-dim"
        }`}
      >
        {optimistic ? "Trained ✓" : "Trained"}
      </button>
      {failed && <SaveError onRetry={toggle} />}
    </div>
  );
}
