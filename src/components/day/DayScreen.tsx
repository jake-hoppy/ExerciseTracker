import { loadDayScreen } from "@/lib/day-screen";
import { DateNav } from "./DateNav";
import { DayLog } from "./DayLog";
import { NotesField } from "./NotesField";
import { TrainedToggle } from "./TrainedToggle";
import { WeightField } from "./WeightField";

export async function DayScreen({ date }: { date: string }) {
  const data = await loadDayScreen(date);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <header
        className={`border-l-2 pl-3 ${data.isToday ? "border-l-rust" : "border-l-line"}`}
      >
        <DateNav date={date} isToday={data.isToday} blockName={data.blockName} />

        <div className="flex items-center justify-between gap-4">
          <h1
            className={`font-display text-3xl font-semibold tracking-wide ${
              data.isRest ? "text-ink-dim" : "text-ink"
            }`}
          >
            {data.sessionName ?? "—"}
          </h1>
          <TrainedToggle date={date} trained={data.day?.trained ?? false} />
        </div>

      </header>

      <DayLog
        date={date}
        entries={data.entries}
        topItems={data.topItems}
        items={data.items}
        isToday={data.isToday}
        targets={data.targets}
      >
        <WeightField date={date} weight={data.day?.weight ?? null} avg={data.weightAvg} />
      </DayLog>

      <NotesField date={date} notes={data.day?.notes ?? null} />
    </main>
  );
}
