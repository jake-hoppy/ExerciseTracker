import type { DateString } from "./dates";
import { db } from "./db";

/**
 * The Day row for `date`, created if nothing has been logged on it yet
 * (rule R1b). No block, no schedule, no setup step: any date is loggable.
 */
export function ensureDay(date: DateString) {
  return db.day.upsert({ where: { date }, update: {}, create: { date } });
}
