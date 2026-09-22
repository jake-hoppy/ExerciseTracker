"use client";

import { useState } from "react";

type Values = { name: string; calories: number; protein: number; save: boolean };

// Two numeric fields first (kcal gets focus), then an optional name and a
// "Save to list" tickbox. Ticking it, or `requireName`, makes the name
// required. The submit button disables while pending so a double-tap can't
// log twice.
export function ItemForm({
  initial,
  requireName = false,
  showSave = true,
  submitLabel,
  pending = false,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Values>;
  requireName?: boolean;
  showSave?: boolean;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (v: Values) => void;
  onCancel?: () => void;
}) {
  const [cal, setCal] = useState(initial?.calories == null ? "" : String(initial.calories));
  const [prot, setProt] = useState(initial?.protein == null ? "" : String(initial.protein));
  const [name, setName] = useState(initial?.name ?? "");
  const [save, setSave] = useState(initial?.save ?? requireName);
  const [errors, setErrors] = useState<{ cal?: boolean; prot?: boolean; name?: boolean }>({});

  const submit = () => {
    const c = Number(cal);
    const p = Number(prot);
    const needName = requireName || save;
    const e = {
      cal: !(cal.trim() !== "" && Number.isInteger(c) && c >= 0 && c <= 5000),
      prot: !(prot.trim() !== "" && Number.isInteger(p) && p >= 0 && p <= 500),
      name: needName && name.trim() === "",
    };
    setErrors(e);
    if (e.cal || e.prot || e.name) return;
    onSubmit({ name: name.trim(), calories: c, protein: p, save: needName });
  };

  const field = (
    value: string,
    set: (v: string) => void,
    label: string,
    bad: boolean | undefined,
    mode: "numeric" | "text",
    autoFocus = false,
  ) => (
    <input
      type="text"
      inputMode={mode}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => set(e.target.value)}
      placeholder={label}
      aria-label={label}
      aria-invalid={bad || undefined}
      className={`min-h-11 min-w-0 flex-1 rounded-card border bg-bg-alt px-3 text-ink placeholder:text-ink-faint ${
        mode === "numeric" ? "font-mono" : "font-serif"
      } ${bad ? "border-rust" : "border-line"}`}
    />
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        {field(cal, setCal, "kcal", errors.cal, "numeric", true)}
        {field(prot, setProt, "g protein", errors.prot, "numeric")}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-card border border-moss px-4 font-mono text-xs tracking-wider text-moss uppercase disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
      <div className="flex items-center gap-2">
        {field(name, setName, requireName ? "Name" : "Name (optional)", errors.name, "text")}
        {showSave && !requireName && (
          <label className="flex min-h-11 shrink-0 items-center gap-2 font-mono text-xs tracking-wider text-ink-dim uppercase">
            <input
              type="checkbox"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
              className="size-5 accent-moss"
            />
            Save to list
          </label>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 shrink-0 rounded-card px-3 font-mono text-xs tracking-wider text-ink-dim uppercase"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
