"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, LEAVE_KIND_COLORS, LEAVE_KIND_LABELS } from "@/lib/constants";
import { formatEventLocation } from "@/lib/locations";
import type { CalendarEvent, EventType, LeaveKind } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

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

function eventOnDay(event: CalendarEvent, day: Date) {
  const start = parseISO(event.start_date);
  const end = parseISO(event.end_date);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

export function MonthCalendar({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter((e) => eventOnDay(e, selectedDay));
  }, [events, selectedDay]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "yyyy年 M月", { locale: zhCN })}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            今天
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-slate-50 py-2 text-center text-xs font-medium text-slate-500"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = events.filter((e) => eventOnDay(e, day));
          const inMonth = isSameMonth(day, currentMonth);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                "min-h-[88px] bg-white p-1.5 text-left transition-all duration-150 hover:bg-slate-50 active:bg-slate-100",
                !inMonth && "bg-slate-50/80 text-slate-400",
                selected && "ring-2 ring-inset ring-slate-900",
                isToday(day) && "bg-blue-50/50"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-slate-900 font-medium text-white"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                    style={{
                      backgroundColor: eventColor(event),
                    }}
                    title={eventLabel(event)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDay(day);
                      onEventClick(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedDay(day);
                        onEventClick(event);
                      }
                    }}
                  >
                    {eventLabel(event)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[10px] text-slate-500">+{dayEvents.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-medium">
            {format(selectedDay, "M月d日 EEEE", { locale: zhCN })} 的日程
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-slate-500">当天暂无日程</p>
          ) : (
            <ul className="space-y-2">
              {selectedDayEvents.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onEventClick(event)}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition-all duration-150 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm active:scale-[0.99]"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: eventColor(event),
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {[
                          eventTypeLabel(event),
                          formatEventLocation(event.province, event.city),
                          event.description,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
