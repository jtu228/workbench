"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/actions";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/lib/constants";
import type { CalendarEvent, Project } from "@/lib/types/database";

type ProjectOption = Pick<Project, "id" | "name">;

export function CalendarView({
  events,
  projects,
}: {
  events: CalendarEvent[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState("client_visit");

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [events]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createCalendarEvent(formData);
      setShowForm(false);
      router.refresh();
    });
  }

  function handleEventClick(event: CalendarEvent) {
    if (confirm(`删除「${event.title}」？`)) {
      startTransition(async () => {
        await deleteCalendarEvent(event.id);
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">日历</h1>
          <p className="text-slate-500">外出、请假、审核安排</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          新建日程
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: EVENT_TYPE_COLORS[key as keyof typeof EVENT_TYPE_COLORS] }}
            />
            {label}
          </div>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新建日程</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>标题</Label>
                <Input name="title" required placeholder="例如：外出拜访客户" />
              </div>
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input name="end_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <input type="hidden" name="event_type" value={eventType} />
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>关联项目</Label>
                <select
                  name="project_id"
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="">无</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>详情</Label>
                <Textarea name="description" placeholder="备注信息" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <MonthCalendar events={sortedEvents} onEventClick={handleEventClick} />
        </CardContent>
      </Card>
    </div>
  );
}
