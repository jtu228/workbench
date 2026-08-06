import { getCalendarEvents, getProjectOptions } from "@/lib/queries";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const [events, projects] = await Promise.all([
    getCalendarEvents(),
    getProjectOptions(),
  ]);
  return <CalendarView events={events} projects={projects} />;
}
