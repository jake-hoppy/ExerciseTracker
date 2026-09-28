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
    <section className="mt-9" aria-label="Notes">
      <label className="label mb-2 block" htmlFor="notes">
        Notes
      </label>
      <textarea
        id="notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={2}
        placeholder="How it went."
        className="min-h-11 w-full resize-none rounded-card border border-rule-soft bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-chalk placeholder:text-chalk-3 focus:border-rule focus:bg-board-2"
      />
      {failed && <SaveError onRetry={save} />}
    </section>
  );
}
