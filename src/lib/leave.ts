import { differenceInCalendarDays, isWithinInterval, parseISO, startOfDay } from "date-fns";
import type { CalendarEvent, LeaveKind, UserLeaveSettings } from "@/lib/types/database";

export const DEFAULT_LEAVE_SETTINGS: Omit<UserLeaveSettings, "user_id" | "created_at" | "updated_at"> =
  {
    annual_leave_days: 5,
    only_child_leave_days: 5,
    sick_leave_days_per_month: 1,
  };

function eventDayCount(event: CalendarEvent) {
  const start = parseISO(event.start_date);
  const end = parseISO(event.end_date || event.start_date);
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
}

function isLeaveOfKind(event: CalendarEvent, kind: LeaveKind) {
  return event.event_type === "leave" && event.leave_kind === kind;
}

function usedDaysInRange(
  events: CalendarEvent[],
  kind: LeaveKind,
  rangeStart: Date,
  rangeEnd: Date
) {
  let total = 0;
  for (const event of events) {
    if (!isLeaveOfKind(event, kind)) continue;
    const start = startOfDay(parseISO(event.start_date));
    const end = startOfDay(parseISO(event.end_date || event.start_date));
    // Count overlapping calendar days with the range
    let day = start;
    while (day <= end) {
      if (isWithinInterval(day, { start: rangeStart, end: rangeEnd })) {
        total += 1;
      }
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    }
  }
  return total;
}

export function getLeaveBalances(
  events: CalendarEvent[],
  settings: Pick<
    UserLeaveSettings,
    "annual_leave_days" | "only_child_leave_days" | "sick_leave_days_per_month"
  > = DEFAULT_LEAVE_SETTINGS,
  now = new Date()
) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = startOfDay(new Date(year, 11, 31));
  const monthStart = startOfDay(new Date(year, month, 1));
  const monthEnd = startOfDay(new Date(year, month + 1, 0));

  const sickUsed = usedDaysInRange(events, "sick", monthStart, monthEnd);
  const annualUsed = usedDaysInRange(events, "annual", yearStart, yearEnd);
  const onlyChildUsed = usedDaysInRange(events, "only_child", yearStart, yearEnd);

  const sickTotal = Number(settings.sick_leave_days_per_month);
  const annualTotal = Number(settings.annual_leave_days);
  const onlyChildTotal = Number(settings.only_child_leave_days);

  return {
    sick: {
      label: "本月病假",
      total: sickTotal,
      used: sickUsed,
      remaining: Math.max(0, sickTotal - sickUsed),
      unit: "天",
      hint: sickUsed > 0 ? `本月已用 ${sickUsed} 天` : "本月尚未使用",
    },
    annual: {
      label: "今年年假",
      total: annualTotal,
      used: annualUsed,
      remaining: Math.max(0, annualTotal - annualUsed),
      unit: "天",
      hint: `今年已用 ${annualUsed} / ${annualTotal} 天`,
    },
    onlyChild: {
      label: "独生子女假",
      total: onlyChildTotal,
      used: onlyChildUsed,
      remaining: Math.max(0, onlyChildTotal - onlyChildUsed),
      unit: "天",
      hint: onlyChildUsed > 0 ? `今年已用 ${onlyChildUsed} 天` : "尚未使用",
    },
  };
}

export function countLeaveDays(event: CalendarEvent) {
  return eventDayCount(event);
}
