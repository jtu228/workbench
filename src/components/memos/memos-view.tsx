"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createMemo, deleteMemo, updateMemo } from "@/lib/actions";
import type { Memo } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";

export function MemosView({ memos }: { memos: Memo[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Memo | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (editing) {
        await updateMemo(editing.id, formData);
        setEditing(null);
      } else {
        await createMemo(formData);
      }
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">备忘录</h1>
          <p className="text-slate-500">日常备忘与快速记录</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
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
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input name="title" required defaultValue={editing?.title ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <Textarea name="content" rows={4} defaultValue={editing?.content ?? ""} />
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
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  保存
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
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
          memos.map((memo) => (
            <Card key={memo.id} className={memo.is_pinned ? "border-amber-300" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  {memo.is_pinned && <Pin className="mr-1 inline h-4 w-4 text-amber-500" />}
                  {memo.title}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(memo);
                      setShowForm(true);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteMemo(memo.id);
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{memo.content}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {memo.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">{formatDate(memo.updated_at)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
