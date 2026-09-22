// A number with a caption. The value is mono; the caption is a .label.
export function StatTile({
  label,
  value,
  unit,
  note,
  lead = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  lead?: boolean;
}) {
  return (
    <div className={`border-t border-line-soft pt-2 ${lead ? "col-span-2" : ""}`}>
      <p className="label">{label}</p>
      <p className={`mt-0.5 font-mono tabular-nums ${lead ? "text-3xl text-parchment" : "text-xl text-ink"}`}>
        {value}
        {unit && <span className="ml-1 text-sm text-ink-faint">{unit}</span>}
      </p>
      {note && <p className="font-mono text-xs text-ink-dim">{note}</p>}
    </div>
  );
}
