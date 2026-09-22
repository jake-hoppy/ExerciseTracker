"use client";

import { useState, useTransition } from "react";
import { saveNotesAction } from "@/app/actions";
import { SaveError } from "./SaveError";

// Saves on blur. No button. Reads as the next blank line on the page.
export function NotesField({ date, notes }: { date: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  const save = () => {
    if (value.trim() === saved.trim()) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await saveNotesAction(date, value);
        setSaved(value);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <section className="mt-8" aria-label="Notes">
      <label className="label mb-1 block" htmlFor="notes">
        Notes
      </label>
      <textarea
        id="notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={2}
        placeholder="—"
        className="min-h-11 w-full resize-y rounded-card border border-transparent bg-transparent px-0 py-2 font-serif text-ink placeholder:text-ink-faint focus:border-line focus:bg-bg-alt focus:px-3"
      />
      {failed && <SaveError onRetry={save} />}
    </section>
  );
}
