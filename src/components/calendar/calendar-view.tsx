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
import { DateSelect } from "@/components/ui/date-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LeaveBalanceSummary } from "@/components/calendar/leave-balance-summary";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { useToast } from "@/components/ui/toast";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/actions";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, LEAVE_KIND_LABELS } from "@/lib/constants";
import type { getLeaveBalances } from "@/lib/leave";
import { getCitiesForProvince, PROVINCES_FROM_GUANGDONG } from "@/lib/locations";
import type { CalendarEvent, EventType, LeaveKind, Project } from "@/lib/types/database";

type ProjectOption = Pick<Project, "id" | "name">;
type LeaveBalances = ReturnType<typeof getLeaveBalances>;

export function CalendarView({
  events,
  projects,
  leaveBalances,
}: {
  events: CalendarEvent[];
  projects: ProjectOption[];
  leaveBalances: LeaveBalances;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eventType, setEventType] = useState<EventType>("client_visit");
  const [leaveKind, setLeaveKind] = useState<LeaveKind>("sick");
  const [province, setProvince] = useState("广东省");
  const [city, setCity] = useState("广州市");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const cities = useMemo(() => getCitiesForProvince(province), [province]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [events]
  );

  function openCreateForm() {
    setEditingEvent(null);
    setEventType("client_visit");
    setLeaveKind("sick");
    setProvince("广东省");
    setCity("广州市");
    setStartDate("");
    setEndDate("");
    setShowForm(true);
  }

  function openEditForm(event: CalendarEvent) {
    setEditingEvent(event);
    setEventType(event.event_type);
    setLeaveKind(event.leave_kind ?? "sick");
    const nextProvince = event.province || "广东省";
    setProvince(nextProvince);
    const available = getCitiesForProvince(nextProvince);
    const nextCity = event.city && available.includes(event.city) ? event.city : available[0] ?? "";
    setCity(nextCity);
    setStartDate(event.start_date ?? "");
    setEndDate(event.end_date ?? "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEvent(null);
    setEventType("client_visit");
    setLeaveKind("sick");
    setProvince("广东省");
    setCity("广州市");
    setStartDate("");
    setEndDate("");
  }

  function handleProvinceChange(nextProvince: string) {
    setProvince(nextProvince);
    const available = getCitiesForProvince(nextProvince);
    setCity(available[0] ?? "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("province", province);
    formData.set("city", city);
    formData.set("start_date", startDate);
    formData.set("end_date", endDate || startDate);
    formData.set("event_type", eventType);
    if (eventType === "leave") {
      formData.set("leave_kind", leaveKind);
    } else {
      formData.delete("leave_kind");
    }
    if (!startDate) {
      alert("请选择开始日期");
      return;
    }
    if (eventType === "leave" && !leaveKind) {
      alert("请选择请假类型");
      return;
    }
    startTransition(async () => {
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, formData);
        toast({ title: "日程已更新", variant: "success" });
      } else {
        await createCalendarEvent(formData);
        toast({ title: "日程已创建", variant: "success" });
      }
      closeForm();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!editingEvent) return;
    setConfirmDelete(true);
  }

  function confirmDeleteEvent() {
    if (!editingEvent) return;
    startTransition(async () => {
      await deleteCalendarEvent(editingEvent.id);
      setConfirmDelete(false);
      toast({ title: "日程已删除", variant: "success" });
      closeForm();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDelete}
        title="删除日程？"
        description={editingEvent ? `确认删除「${editingEvent.title}」吗？` : undefined}
        confirmLabel="确认删除"
        destructive
        pending={isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteEvent}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div>
            <h1 className="text-2xl font-bold">日历</h1>
            <p className="text-slate-500">外出、请假、审核安排</p>
          </div>
          <LeaveBalanceSummary balances={leaveBalances} variant="inline" />
        </div>
        <Button onClick={openCreateForm} className="shrink-0">
          <Plus className="h-4 w-4" />
          新建日程
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: EVENT_TYPE_COLORS[key as keyof typeof EVENT_TYPE_COLORS] }}
            />
            {label}
          </div>
        ))}
        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium text-red-500">六日</span>
          周末
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="text-xs font-medium text-red-500">休</span>
          节假日
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="text-xs font-medium text-slate-500">班</span>
          调休上班
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingEvent ? "编辑日程" : "新建日程"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={editingEvent?.id ?? "new"}
              onSubmit={handleSubmit}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2 sm:col-span-2">
                <Label>标题</Label>
                <Input
                  name="title"
                  required
                  defaultValue={editingEvent?.title ?? ""}
                  placeholder="例如：外出拜访客户"
                />
              </div>
              <DateSelect
                label="开始日期"
                value={startDate}
                required
                onChange={setStartDate}
              />
              <DateSelect
                label="结束日期"
                value={endDate}
                onChange={setEndDate}
              />
              <div className="space-y-2">
                <Label>类型</Label>
                <input type="hidden" name="event_type" value={eventType} />
                <Select
                  value={eventType}
                  onValueChange={(v) => {
                    const next = v as EventType;
                    setEventType(next);
                    if (next === "leave" && !leaveKind) setLeaveKind("sick");
                  }}
                >
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
              {eventType === "leave" ? (
                <div className="space-y-2">
                  <Label>请假类型</Label>
                  <input type="hidden" name="leave_kind" value={leaveKind} />
                  <Select value={leaveKind} onValueChange={(v) => setLeaveKind(v as LeaveKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAVE_KIND_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>关联项目</Label>
                  <select
                    name="project_id"
                    defaultValue={editingEvent?.project_id ?? ""}
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
              )}
              {eventType === "leave" && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>关联项目</Label>
                  <select
                    name="project_id"
                    defaultValue={editingEvent?.project_id ?? ""}
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
              )}
              <div className="space-y-2">
                <Label>省份</Label>
                <Select value={province} onValueChange={handleProvinceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择省份" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES_FROM_GUANGDONG.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>城市</Label>
                <Select value={city} onValueChange={setCity} disabled={cities.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择城市" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>详情</Label>
                <Textarea
                  name="description"
                  defaultValue={editingEvent?.description ?? ""}
                  placeholder="备注信息"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "保存中..." : "保存"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} disabled={isPending}>
                  取消
                </Button>
                {editingEvent && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    删除
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <MonthCalendar events={sortedEvents} onEventClick={openEditForm} />
        </CardContent>
      </Card>
    </div>
  );
}
