"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { archiveItemAction, upsertItemAction } from "@/app/actions";
import type { ItemView } from "@/lib/day-screen";
import type { QuickAdd } from "./DayLog";
import { ItemForm } from "./ItemForm";
import { ItemRow } from "./ItemRow";
import { SaveError } from "./SaveError";

// Bottom sheet over Today. Quick add first (it's why you opened it), then
// every item by use, then New item. Logging does not close it. A filter box
// appears only past 20 items (docs/07-food-log.md). Item edit/archive is
// behind a ⋯ button on each row: discoverable and keyboard-reachable, which
// a long-press is not.
export function AddFoodSheet({
  date,
  open,
  onClose,
  items,
  onLog,
  onQuickAdd,
}: {
  date: string;
  open: boolean;
  onClose: () => void;
  items: ItemView[];
  onLog: (item: ItemView) => void;
  onQuickAdd: QuickAdd;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<ItemView | "new" | null>(null);
  const [quickKey, setQuickKey] = useState(0);
  const [failed, setFailed] = useState<(() => void) | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const shown = items.filter((i) => i.name.toLowerCase().includes(filter.trim().toLowerCase()));

  // Edits an existing item, or creates a new one and logs it (spec: New item
  // saves and logs).
  const saveItem = (values: { name: string; calories: number; protein: number }, id?: string) => {
    const attempt = () =>
      startTransition(async () => {
        setFailed(null);
        try {
          const saved = await upsertItemAction(date, { id, ...values });
          setEditing(null);
          if (!id) onLog({ id: saved.id, ...values });
        } catch {
          setFailed(() => attempt);
        }
      });
    attempt();
  };

  const archive = (id: string) => {
    const attempt = () =>
      startTransition(async () => {
        setFailed(null);
        try {
          await archiveItemAction(date, id);
          setEditing(null);
        } catch {
          setFailed(() => attempt);
        }
      });
    attempt();
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose(); // scrim tap
      }}
      aria-label="Add food"
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-2xl overflow-y-auto border-t-2 border-rule bg-board-2 p-0 text-chalk backdrop:bg-black/70 sm:mb-6 sm:rounded-card sm:border-2"
    >
      <div className="px-4 pt-4 pb-6">
        <section aria-label="Quick add">
          <p className="label mb-2">Quick add</p>
          <ItemForm
            key={quickKey}
            submitLabel="Log"
            pending={isPending}
            onSubmit={(v) => {
              onQuickAdd({
                calories: v.calories,
                protein: v.protein,
                name: v.name || undefined,
                save: v.save,
              });
              // Reset for the next one-off; the entry shows under Logged behind the sheet.
              setQuickKey((k) => k + 1);
            }}
          />
        </section>

        <section className="mt-6" aria-label="Items">
          <div className="mb-1 flex items-center justify-between">
            <p className="label">Items</p>
            {items.length > 20 && (
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter"
                aria-label="Filter items"
                className="min-h-11 w-32 rounded-card border border-rule bg-board-2 px-3 font-mono text-sm text-chalk"
              />
            )}
          </div>
          <ul className="divide-y divide-rule-soft border-y border-rule-soft">
            {shown.map((item) =>
              editing !== "new" && editing?.id === item.id ? (
                <li key={item.id} className="border-l-2 border-l-gold py-3 pl-3">
                  <ItemForm
                    initial={item}
                    requireName
                    showSave={false}
                    submitLabel="Save"
                    pending={isPending}
                    onSubmit={(v) => saveItem(v, item.id)}
                    onCancel={() => setEditing(null)}
                  />
                  <button
                    type="button"
                    onClick={() => archive(item.id)}
                    className="mt-1 min-h-11 font-mono text-xs tracking-wider text-over uppercase"
                  >
                    Archive item
                  </button>
                </li>
              ) : (
                <ItemRow
                  key={item.id}
                  item={item}
                  onLog={onLog}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      aria-label={`Edit item ${item.name}`}
                      className="flex min-h-11 min-w-11 items-center justify-center font-mono text-chalk-3"
                    >
                      ⋯
                    </button>
                  }
                />
              ),
            )}
          </ul>
          {failed && <SaveError onRetry={failed} />}
        </section>

        <section className="mt-6" aria-label="New item">
          {editing === "new" ? (
            <ItemForm
              requireName
              showSave={false}
              submitLabel="Save"
              pending={isPending}
              onSubmit={(v) => saveItem(v)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="flex min-h-11 w-full items-center border-b border-rule-soft text-left font-mono text-sm text-chalk-2"
            >
              + New item
            </button>
          )}
        </section>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-card border border-rule font-mono text-xs tracking-wider text-chalk-2 uppercase"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
