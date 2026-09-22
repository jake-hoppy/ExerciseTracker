"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, isDateString } from "@/lib/dates";
import { routeFor } from "@/lib/routes";
import { formatShortDate, formatWeekday } from "@/lib/format";

// ‹ › step a day. The date itself is a native <input type="date"> styled as
// text, so the phone's own picker does the jumping (rule R1c). No library.
export function DateNav({
  date,
  isToday,
  blockName,
}: {
  date: string;
  isToday: boolean;
  blockName: string | null;
}) {
  const router = useRouter();
  const label = `${formatWeekday(date)} ${formatShortDate(date)}${isToday ? " · today" : ""}${
    blockName ? ` · ${blockName}` : ""
  }`;

  return (
    <nav className="flex min-h-11 items-center justify-between" aria-label="Change day">
      <Link
        href={routeFor(addDays(date, -1))}
        className="-ml-3 flex min-h-11 min-w-11 items-center justify-center font-mono text-lg text-ink-dim"
        aria-label="Previous day"
      >
        ‹
      </Link>
      <label className="relative flex min-h-11 items-center">
        <span className="font-mono text-sm text-ink-dim">{label}</span>
        <input
          type="date"
          value={date}
          aria-label="Pick a date"
          onChange={(e) => {
            const v = e.target.value;
            if (isDateString(v)) router.push(routeFor(v));
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Link
        href={routeFor(addDays(date, 1))}
        className="flex min-h-11 min-w-11 items-center justify-center font-mono text-lg text-ink-dim"
        aria-label="Next day"
      >
        ›
      </Link>
    </nav>
  );
}
