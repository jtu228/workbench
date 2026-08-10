"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateSelect } from "@/components/ui/date-select";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMemo, deleteMemo, updateMemo } from "@/lib/actions";
import { formatEventLocation, getCitiesForProvince, PROVINCES_FROM_GUANGDONG } from "@/lib/locations";
import type { Memo } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";

export function MemosView({ memos }: { memos: Memo[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Memo | null>(null);
  const [deletingMemo, setDeletingMemo] = useState<Memo | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [province, setProvince] = useState("广东省");
  const [city, setCity] = useState("广州市");
  const [addToCalendar, setAddToCalendar] = useState(false);

  const cities = useMemo(() => getCitiesForProvince(province), [province]);

  function resetFormState() {
    setEditing(null);
    setEventDate("");
    setProvince("广东省");
    setCity("广州市");
    setAddToCalendar(false);
  }

  function openCreate() {
    resetFormState();
    setShowForm(true);
  }

  function openEdit(memo: Memo) {
    setEditing(memo);
    setEventDate(memo.event_date ?? "");
    const nextProvince = memo.province || "广东省";
    setProvince(nextProvince);
    const available = getCitiesForProvince(nextProvince);
    const nextCity =
      memo.city && available.includes(memo.city) ? memo.city : available[0] ?? "";
    setCity(nextCity);
    setAddToCalendar(memo.add_to_calendar);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetFormState();
  }

  function handleProvinceChange(nextProvince: string) {
    setProvince(nextProvince);
    const available = getCitiesForProvince(nextProvince);
    setCity(available[0] ?? "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("event_date", eventDate);
    formData.set("province", province);
    formData.set("city", city);
    if (addToCalendar) formData.set("add_to_calendar", "on");
    else formData.delete("add_to_calendar");

    startTransition(async () => {
      try {
        if (editing) {
          await updateMemo(editing.id, formData);
          toast({ title: "备忘已更新", variant: "success" });
        } else {
          await createMemo(formData);
          toast({ title: "备忘已创建", variant: "success" });
        }
        closeForm();
        router.refresh();
      } catch (err) {
        toast({
          title: "保存失败",
          description: err instanceof Error ? err.message : "请稍后重试",
          variant: "error",
        });
      }
    });
  }

  function confirmDeleteMemo() {
    if (!deletingMemo) return;
    startTransition(async () => {
      await deleteMemo(deletingMemo.id);
      setDeletingMemo(null);
      toast({ title: "备忘已删除", variant: "success" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={Boolean(deletingMemo)}
        title="删除备忘？"
        description={deletingMemo ? `确认删除「${deletingMemo.title}」吗？` : undefined}
        confirmLabel="确认删除"
        destructive
        pending={isPending}
        onCancel={() => setDeletingMemo(null)}
        onConfirm={confirmDeleteMemo}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">备忘录</h1>
          <p className="text-slate-500">日常备忘与快速记录</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建备忘
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? "编辑备忘" : "新建备忘"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={editing?.id ?? "new"}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>标题</Label>
                <Input name="title" required defaultValue={editing?.title ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <Textarea name="content" rows={4} defaultValue={editing?.content ?? ""} />
              </div>
              <DateSelect label="日期" value={eventDate} onChange={setEventDate} />
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              <div className="space-y-2">
                <Label>标签（逗号分隔）</Label>
                <Input
                  name="tags"
                  placeholder="工作, 紧急"
                  defaultValue={editing?.tags?.join(", ") ?? ""}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_pinned"
                  defaultChecked={editing?.is_pinned}
                  className="h-4 w-4"
                />
                置顶
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                <Checkbox
                  checked={addToCalendar}
                  onCheckedChange={(checked) => setAddToCalendar(checked === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">同步到日历</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    勾选后，该备忘会出现在日历中；取消勾选会从日历移除对应日程
                  </span>
                </span>
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  保存
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memos.length === 0 ? (
          <p className="text-slate-500">暂无备忘录</p>
        ) : (
          memos.map((memo) => {
            const location = formatEventLocation(memo.province, memo.city);
            return (
              <Card
                key={memo.id}
                role="button"
                tabIndex={0}
                className={`cursor-pointer border transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${
                  memo.is_pinned ? "border-amber-300" : "border-slate-200"
                }`}
                onClick={() => openEdit(memo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(memo);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {memo.is_pinned && <Pin className="mr-1 inline h-4 w-4 text-amber-500" />}
                    {memo.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingMemo(memo);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {memo.content ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-600">{memo.content}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {memo.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    {memo.add_to_calendar && <Badge variant="secondary">已同步日历</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {[
                      memo.event_date ? formatDate(memo.event_date) : null,
                      location,
                      formatDate(memo.updated_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
