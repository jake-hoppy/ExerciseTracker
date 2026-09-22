"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  logItemAction,
  quickAddAction,
  removeEntryAction,
  updateEntryAction,
} from "@/app/actions";
import { pendingId } from "@/lib/client-ids";
import type { EntryView, ItemView } from "@/lib/day-screen";
import { dayTotals } from "@/lib/totals";
import { AddFoodSheet } from "./AddFoodSheet";
import { EntryRow } from "./EntryRow";
import { ItemRow } from "./ItemRow";
import { Remaining } from "./Remaining";
import { SaveError } from "./SaveError";

export type OptimisticEntry = EntryView & { pending?: boolean };

export type QuickAdd = (input: {
  calories: number;
  protein: number;
  name?: string;
  save: boolean;
}) => void;

type Action =
  | { type: "add"; entry: OptimisticEntry }
  | { type: "edit"; id: string; calories: number; protein: number }
  | { type: "remove"; id: string };

function reduce(state: OptimisticEntry[], a: Action): OptimisticEntry[] {
  switch (a.type) {
    case "add":
      return [...state, a.entry];
    case "edit":
      return state.map((e) =>
        e.id === a.id ? { ...e, calories: a.calories, protein: a.protein, pending: true } : e,
      );
    case "remove":
      return state.filter((e) => e.id !== a.id);
  }
}

// Owns the day's entries. Every tap updates the list and the remaining
// headline immediately; the server render replaces it. A failed action
// reverts (useOptimistic does that when the transition settles) and shows
// one retry line. `children` is the weight field, which sits between the
// remaining line and the logged list.
export function DayLog({
  date,
  entries,
  topItems,
  items,
  isToday,
  targets,
  children,
}: {
  date: string;
  entries: EntryView[];
  topItems: ItemView[];
  items: ItemView[];
  isToday: boolean;
  targets: { calTarget: number | null; proteinTarget: number | null };
  children?: React.ReactNode;
}) {
  const [optimistic, dispatch] = useOptimistic(entries as OptimisticEntry[], reduce);
  const [, startTransition] = useTransition();
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const run = (a: Action, fn: () => Promise<void>) => {
    const attempt = () =>
      startTransition(async () => {
        dispatch(a);
        setRetry(null);
        try {
          await fn();
        } catch {
          setRetry(() => attempt);
        }
      });
    attempt();
  };

  const log = (item: ItemView) =>
    run(
      {
        type: "add",
        entry: {
          id: pendingId(),
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          pending: true,
        },
      },
      () => logItemAction(date, item.id),
    );

  const quickAdd: QuickAdd = (input) =>
    run(
      {
        type: "add",
        entry: {
          id: pendingId(),
          name: input.name ?? null,
          calories: input.calories,
          protein: input.protein,
          pending: true,
        },
      },
      () => quickAddAction(date, input),
    );

  const edit = (id: string, n: { calories: number; protein: number }) =>
    run({ type: "edit", id, ...n }, () => updateEntryAction(date, id, n));

  const remove = (id: string) => run({ type: "remove", id }, () => removeEntryAction(date, id));

  return (
    <>
      {/* Continues the header's margin rule (rust = today) through the
          remaining line and the weight line, per docs/10-today-design.md. */}
      <div className={`border-l-2 pt-5 pl-3 ${isToday ? "border-l-rust" : "border-l-line"}`}>
        <Remaining totals={dayTotals(optimistic)} targets={targets} />
        {children}
      </div>

      {optimistic.length > 0 && (
        <section className="mt-8" aria-label="Logged">
          <p className="label mb-1">Logged</p>
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {optimistic.map((e) => (
              <EntryRow key={e.id} entry={e} onEdit={edit} onRemove={remove} />
            ))}
          </ul>
        </section>
      )}
      {retry && <SaveError onRetry={retry} />}

      <section className="mt-8" aria-label="Log">
        <p className="label mb-1">Log</p>
        <ul className="divide-y divide-line-soft border-y border-line-soft">
          {topItems.map((i) => (
            <ItemRow key={i.id} item={i} onLog={log} />
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-11 w-full items-center justify-between border-b border-line-soft pl-7 font-mono text-sm text-ink-dim"
        >
          <span>All items and quick add</span>
          <span className="pr-4 text-lg">›</span>
        </button>
        <AddFoodSheet
          date={date}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          items={items}
          onLog={log}
          onQuickAdd={quickAdd}
        />
      </section>
    </>
  );
}
