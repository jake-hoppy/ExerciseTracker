// Client-safe: no database import, so client components can build links.

import { today, type DateString } from "./dates";

/** "/" for today, "/d/YYYY-MM-DD" for any other date. */
export function routeFor(date: DateString, current: DateString = today()): string {
  return date === current ? "/" : `/d/${date}`;
}
