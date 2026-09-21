// Calendar-date helpers (rule R7). A date is a "YYYY-MM-DD" string, never a
// timestamp. Arithmetic runs in UTC purely as a calendar: nothing here reads
// the local clock or timezone, so a date can't shift to a neighbouring day.

export type DateString = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateString(value: string): value is DateString {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return (
    t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
  );
}

function toUtc(date: DateString): Date {
  if (!isDateString(date)) throw new Error(`Not a calendar date: ${date}`);
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(t: Date): DateString {
  const y = String(t.getUTCFullYear()).padStart(4, "0");
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: DateString, n: number): DateString {
  const t = toUtc(date);
  t.setUTCDate(t.getUTCDate() + n);
  return fromUtc(t);
}

/** 0 = Sunday … 6 = Saturday, for the calendar date itself. */
export function weekdayIndex(date: DateString): number {
  return toUtc(date).getUTCDay();
}

/** Every date from start to end, inclusive. */
export function eachDate(start: DateString, end: DateString): DateString[] {
  if (end < start) throw new Error(`Range ends before it starts: ${start}..${end}`);
  const out: DateString[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}
