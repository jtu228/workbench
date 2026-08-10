import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, LEAVE_KIND_COLORS, LEAVE_KIND_LABELS } from "@/lib/constants";
import { formatEventLocation } from "@/lib/locations";
import type { CalendarEvent, EventType, LeaveKind } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function eventOnDay(event: CalendarEvent, day: Date) {
  const start = parseISO(event.start_date);
  const end = parseISO(event.end_date);
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

function eventTypeLabel(event: CalendarEvent) {
  if (event.event_type === "leave" && event.leave_kind) {
    return LEAVE_KIND_LABELS[event.leave_kind as LeaveKind];
  }
  return EVENT_TYPE_LABELS[event.event_type as EventType];
}

function eventColor(event: CalendarEvent) {
  if (event.event_type === "leave" && event.leave_kind) {
    return LEAVE_KIND_COLORS[event.leave_kind as LeaveKind];
  }
  return EVENT_TYPE_COLORS[event.event_type as EventType];
}

function eventLabel(event: CalendarEvent) {
  const location = formatEventLocation(event.province, event.city);
  return [event.title, eventTypeLabel(event), location].filter(Boolean).join(" · ");
}

/** Dashboard month overview — larger cells than the compact week strip. */
export function WeekPreviewCalendar({ events }: { events: CalendarEvent[] }) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2.5 text-center text-sm font-medium text-slate-500"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {days.map((day) => {
          const inMonth = isSameMonth(day, today);
          const todayCell = isToday(day);
          const dayEvents = inMonth ? events.filter((e) => eventOnDay(e, day)) : [];

          return (
            <Link
              key={day.toISOString()}
              href="/calendar"
              className={cn(
                "min-h-[118px] bg-white p-2 transition-colors hover:bg-slate-50 sm:min-h-[132px] sm:p-2.5",
                !inMonth && "bg-slate-50/80",
                todayCell && inMonth && "bg-blue-50/80"
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm tabular-nums",
                    !inMonth && "text-slate-300",
                    inMonth && "text-slate-800",
                    todayCell && inMonth && "bg-slate-900 font-semibold text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              {inMonth && (
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="truncate rounded-md px-1.5 py-1 text-xs leading-snug text-white sm:text-[13px]"
                      style={{ backgroundColor: eventColor(event) }}
                      title={eventLabel(event)}
                    >
                      {eventLabel(event)}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="px-1 text-xs text-slate-500">+{dayEvents.length - 3}</div>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
