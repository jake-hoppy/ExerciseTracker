// Saved items order by use, most-used at the top where the thumb is
// (docs/07-food-log.md). Not alphabetical, not recency alone.

type Orderable = { timesUsed: number; lastUsed: Date | null; archived: boolean };

export function orderItems<T extends Orderable>(items: readonly T[]): T[] {
  return items
    .filter((i) => !i.archived)
    .slice()
    .sort((a, b) => {
      if (b.timesUsed !== a.timesUsed) return b.timesUsed - a.timesUsed;
      const at = a.lastUsed?.getTime() ?? -Infinity;
      const bt = b.lastUsed?.getTime() ?? -Infinity;
      return bt - at;
    });
}

/** The inline "Log" rows on Today: the first `n` of an already-ordered list. */
export function topItems<T>(ordered: readonly T[], n = 6): T[] {
  return ordered.slice(0, n);
}
