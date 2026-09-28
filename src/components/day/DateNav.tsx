"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, isDateString } from "@/lib/dates";
import { routeFor } from "@/lib/routes";
import { formatShortDate, formatWeekday } from "@/lib/format";

// ‹ › step a day. The date itself is a native <input type="date"> styled as
// text, so the phone's own picker does the jumping (rule R1c). No library.
export function DateNav({ date, isToday }: { date: string; isToday: boolean }) {
  const router = useRouter();

  return (
    <nav className="flex min-h-11 items-center justify-between" aria-label="Change day">
      <Link
        href={routeFor(addDays(date, -1))}
        className="-ml-3 flex min-h-11 min-w-11 items-center justify-center text-xl text-chalk-2 transition-colors duration-150 hover:text-chalk"
        aria-label="Previous day"
      >
        ‹
      </Link>
      <label className="relative flex min-h-11 items-center gap-2.5 rounded-card px-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold">
        <span className="font-mono text-[13px] tracking-[0.08em] text-chalk-2 uppercase">
          {formatWeekday(date)} {formatShortDate(date)}
        </span>
        {isToday && (
          <span className="font-mono text-[11px] tracking-[0.08em] text-gold uppercase">today</span>
        )}
        <input
          type="date"
          value={date}
          aria-label="Pick a date"
          onChange={(e) => {
            const v = e.target.value;
            if (isDateString(v)) router.push(routeFor(v));
          }}
          className="absolute inset-0 cursor-pointer opacity-0 focus:outline-none"
        />
      </label>
      <Link
        href={routeFor(addDays(date, 1))}
        className="-mr-3 flex min-h-11 min-w-11 items-center justify-center text-xl text-chalk-2 transition-colors duration-150 hover:text-chalk"
        aria-label="Next day"
      >
        ›
      </Link>
    </nav>
  );
}
