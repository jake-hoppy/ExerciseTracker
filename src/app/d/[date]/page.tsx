import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DayScreen } from "@/components/day/DayScreen";
import { isDateString } from "@/lib/dates";

// Any calendar date, past or future, renders the same screen (rule R1c).
// A malformed or impossible date is a 404, never a fallback to another day.
export default async function DayPage(props: PageProps<"/d/[date]">) {
  await connection();
  const { date } = await props.params;
  if (!isDateString(date)) notFound();
  return <DayScreen date={date} />;
}
