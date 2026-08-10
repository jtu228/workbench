import { CalendarView } from "@/components/calendar/calendar-view";
import { DEFAULT_LEAVE_SETTINGS, getLeaveBalances } from "@/lib/leave";
import { getCalendarEvents, getLeaveSettings, getProjectOptions } from "@/lib/queries";

export default async function CalendarPage() {
  const [events, projects, leaveSettings] = await Promise.all([
    getCalendarEvents(),
    getProjectOptions(),
    getLeaveSettings(),
  ]);
  const leaveBalances = getLeaveBalances(events, leaveSettings ?? DEFAULT_LEAVE_SETTINGS);
  return (
    <CalendarView events={events} projects={projects} leaveBalances={leaveBalances} />
  );
}
