"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteDocument, uploadDocument } from "@/lib/actions";
import { DOC_TYPE_LABELS } from "@/lib/constants";
import type { Document, Project } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

type DocumentWithProject = Document & { projects?: { name: string } | null };
type ProjectOption = Pick<Project, "id" | "name">;

export function DocumentsView({
  documents,
  projects,
}: {
  documents: DocumentWithProject[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("all");
  const [docType, setDocType] = useState("contract");

  const filtered =
    filter === "all" ? documents : documents.filter((d) => d.doc_type === filter);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await uploadDocument(formData);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  async function handleDownload(storagePath: string, fileName: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("documents").download(storagePath);
    if (error || !data) {
      alert("下载失败");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">文档中心</h1>
        <p className="text-slate-500">合同存储、认证资料与模板调用</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            上传文档
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>文件</Label>
              <Input name="file" type="file" required />
            </div>
            <div className="space-y-2">
              <Label>文档类型</Label>
              <input type="hidden" name="doc_type" value={docType} />
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
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
            <div className="flex items-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "上传中..." : "上传"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          全部
        </Button>
        {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">文件名</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">关联项目</th>
              <th className="px-4 py-3">上传时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  暂无文档
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3 font-medium">{doc.file_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{DOC_TYPE_LABELS[doc.doc_type]}</Badge>
                  </td>
                  <td className="px-4 py-3">{doc.projects?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.storage_path, doc.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteDocument(doc.id, doc.storage_path);
                            router.refresh();
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
