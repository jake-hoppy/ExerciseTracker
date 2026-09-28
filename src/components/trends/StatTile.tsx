// A number with a caption, ruled off at the top. The value is mono; the
// caption is a .label. `lead` is the one figure that answers "is this block
// working?" and gets the size to match.
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
  if (lead) {
    return (
      <div className="col-span-2 border-t-2 border-rule pt-3 sm:col-span-4">
        <p className="font-mono text-[52px] leading-none font-medium tracking-tight text-chalk tabular-nums">
          {value}
          {unit && <span className="ml-1.5 text-2xl text-chalk-2">{unit}</span>}
        </p>
        <p className="mt-2 text-[15px] text-chalk-2">
          {label.toLowerCase()}
          {note && `, ${note}`}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-rule-soft pt-2">
      <p className="label">{label}</p>
      <p className="mt-1 font-mono text-xl text-chalk tabular-nums">
        {value}
        {unit && <span className="ml-1 text-sm text-chalk-3">{unit}</span>}
      </p>
      {note && <p className="mt-0.5 font-mono text-xs text-chalk-3">{note}</p>}
    </div>
  );
}
