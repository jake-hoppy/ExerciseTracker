import { connection } from "next/server";
import { DayScreen } from "@/components/day/DayScreen";
import { TodayGuard } from "@/components/day/TodayGuard";
import { today } from "@/lib/dates";

// Today is the default route. It never redirects: the home-screen icon
// always lands on a page to write on (docs/09-design-brief.md).
export default async function TodayPage() {
  await connection();
  const date = today();
  return (
    <>
      <TodayGuard rendered={date} />
      <DayScreen date={date} />
    </>
  );
}
