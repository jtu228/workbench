"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Trash2, Upload } from "lucide-react";
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
import { DOC_TYPE_LABELS, DOCUMENT_SOURCE_LABELS } from "@/lib/constants";
import type { Document, Project } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { LocalFolderPanel } from "@/components/documents/local-folder-panel";
import { openLocalFile, restoreLocalFolder } from "@/lib/local-folder/fs";

type DocumentWithProject = Document & { projects?: { name: string } | null };
type ProjectOption = Pick<Project, "id" | "name">;
type CloudAccount = { id: string; account_email: string | null } | null;

function ProjectSelect({ projects }: { projects: ProjectOption[] }) {
  return (
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
  );
}

function DocTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <input type="hidden" name="doc_type" value={value} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(DOC_TYPE_LABELS).map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

export function DocumentsView({
  documents,
  projects,
  localFolderAccount,
}: {
  documents: DocumentWithProject[];
  projects: ProjectOption[];
  localFolderAccount: CloudAccount;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("all");
  const [uploadType, setUploadType] = useState("cert_contract");

  const filtered =
    filter === "all" ? documents : documents.filter((d) => d.doc_type === filter);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await uploadDocument(formData);
        form.reset();
        toast({ title: "上传成功", variant: "success" });
        router.refresh();
      } catch (err) {
        toast({
          title: "上传失败",
          description: err instanceof Error ? err.message : "请重试",
          variant: "error",
        });
      }
    });
  }

  async function handleDownload(storagePath: string, fileName: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("documents").download(storagePath);
    if (error || !data) {
      toast({ title: "下载失败", variant: "error" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openIndexedLocalFile(relativePath: string) {
    try {
      const restored = await restoreLocalFolder();
      if (!restored) {
        toast({
          title: "请先链接本机 G:\\",
          description: "在上方「本机 Google Drive」重新选择文件夹授权",
          variant: "error",
        });
        return;
      }
      const result = await openLocalFile(
        restored.handle,
        relativePath,
        restored.meta.rootAbsolutePath
      );
      if (result.mode === "office") {
        toast({
          title: "已尝试用 Excel/Office 打开",
          description: result.absolutePath
            ? `若未弹出，路径已复制：${result.absolutePath} — 可粘贴到资源管理器地址栏回车`
            : "若未弹出，请检查上方「本机绝对路径」是否为 G:\\CCIC 等正确路径",
          variant: "success",
        });
      } else if (result.mode === "browser") {
        toast({ title: "已在浏览器预览", variant: "success" });
      }
    } catch (e) {
      toast({
        title: "打开失败",
        description: e instanceof Error ? e.message : "请确认文件仍在 G:\\ 上",
        variant: "error",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">文档中心</h1>
        <p className="text-slate-500">
          本机 Google Drive（G:\）：Word/Excel/PPT 用本机打开，PDF/图片浏览器预览
        </p>
      </div>

      <LocalFolderPanel
        projects={projects}
        serverLinkedName={localFolderAccount?.account_email ?? null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            上传到工作台（小文件）
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
              <DocTypeSelect value={uploadType} onChange={setUploadType} />
            </div>
            <div className="space-y-2">
              <Label>关联项目</Label>
              <ProjectSelect projects={projects} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "处理中..." : "上传"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
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
              <th className="px-4 py-3">来源</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">关联项目</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  暂无文档
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3 font-medium">{doc.file_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {DOCUMENT_SOURCE_LABELS[doc.source] ?? doc.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{DOC_TYPE_LABELS[doc.doc_type]}</Badge>
                  </td>
                  <td className="px-4 py-3">{doc.projects?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {doc.source === "upload" && doc.storage_path ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc.storage_path!, doc.file_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : doc.source === "local_folder" && doc.provider_file_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void openIndexedLocalFile(doc.provider_file_id!)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : doc.external_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(doc.external_url!, "_blank", "noopener,noreferrer")
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : null}
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
