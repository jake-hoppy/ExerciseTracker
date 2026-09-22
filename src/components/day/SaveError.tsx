"use client";

// The only error UI for routine entry: one line, in --danger, tap to retry.
// No modal, no toast (spec: Errors).
export function SaveError({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mt-1 flex min-h-11 w-full items-center text-left font-mono text-sm text-danger"
    >
      Didn&apos;t save — tap to retry
    </button>
  );
}
