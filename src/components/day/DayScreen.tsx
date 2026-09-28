import Link from "next/link";
import { loadDayScreen } from "@/lib/day-screen";
import { DateNav } from "./DateNav";
import { DayLog } from "./DayLog";
import { NotesField } from "./NotesField";
import { TrainedToggle } from "./TrainedToggle";
import { WeightField } from "./WeightField";

export async function DayScreen({ date }: { date: string }) {
  const data = await loadDayScreen(date);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-2 pb-16">
      <div className="border-b border-rule-soft">
        <DateNav date={date} isToday={data.isToday} />
      </div>

      <header className="pt-5">
        {data.blockName && (
          <p className="label mb-1.5">{data.blockName}</p>
        )}
        <div className="flex items-end justify-between gap-4">
          <h1
            className={`font-display text-4xl leading-none font-bold tracking-tight ${
              data.isRest ? "text-chalk-2" : "text-chalk"
            }`}
          >
            {data.sessionName ?? "—"}
          </h1>
          <TrainedToggle date={date} trained={data.day?.trained ?? false} />
        </div>
      </header>

      {/* The day's ruled head. Gold when it's today — the one place the
          accent marks "you are here". */}
      <div className={`mt-4 border-t-2 ${data.isToday ? "border-gold" : "border-rule"}`} />

      <DayLog
        date={date}
        entries={data.entries}
        topItems={data.topItems}
        items={data.items}
        targets={data.targets}
      >
        <WeightField date={date} weight={data.day?.weight ?? null} avg={data.weightAvg} />
      </DayLog>

      <NotesField date={date} notes={data.day?.notes ?? null} />

      <nav
        aria-label="More"
        className="mt-10 grid grid-cols-2 divide-x divide-rule-soft border-y border-rule-soft"
      >
        {[
          { href: "/trends", label: "Trends", note: "Is the block working" },
          { href: "/block", label: "Every day", note: "Fill in a past day" },
        ].map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex min-h-16 flex-col justify-center gap-0.5 py-3 transition-colors duration-150 hover:bg-board-2 ${
              i === 0 ? "pr-4" : "pl-4"
            }`}
          >
            <span className="font-mono text-sm text-chalk">{l.label}</span>
            <span className="text-xs text-chalk-3">{l.note}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
