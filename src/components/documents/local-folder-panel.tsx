"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Folder, HardDrive, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addLocalFolderDocument,
  disconnectLocalFolderLink,
  saveLocalFolderLink,
} from "@/lib/actions";
import { DOC_TYPE_LABELS } from "@/lib/constants";
import type { Project } from "@/lib/types/database";
import { useToast } from "@/components/ui/toast";
import {
  clearLocalFolderLink,
  isLocalFolderSupported,
  listLocalDirectory,
  openLocalFile,
  pickLocalFolder,
  restoreLocalFolder,
  updateLocalFolderMeta,
  SUGGESTED_LOCAL_FOLDER_LABEL,
  type LocalEntry,
  type LocalFolderMeta,
} from "@/lib/local-folder/fs";
import { Input } from "@/components/ui/input";

type ProjectOption = Pick<Project, "id" | "name">;

export function LocalFolderPanel({
  projects,
  serverLinkedName,
}: {
  projects: ProjectOption[];
  serverLinkedName: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [supported, setSupported] = useState(false);
  const [root, setRoot] = useState<FileSystemDirectoryHandle | null>(null);
  const [meta, setMeta] = useState<LocalFolderMeta | null>(null);
  const [path, setPath] = useState("");
  const [files, setFiles] = useState<LocalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState("cert_contract");
  const [projectId, setProjectId] = useState("");

  async function handleOpenEntry(file: LocalEntry) {
    if (!root) return;
    try {
      const result = await openLocalFile(root, file.path, meta?.rootAbsolutePath);
      if (result.mode === "office") {
        toast({
          title: "已调起本机 Office",
          description: "正在打开本地原文件",
          variant: "success",
        });
      } else if (result.mode === "browser") {
        toast({ title: "已在浏览器预览", variant: "success" });
      }
    } catch (err) {
      toast({
        title: "打开失败",
        description: err instanceof Error ? err.message : "请重试",
        variant: "error",
      });
    }
  }

  async function loadDir(handle: FileSystemDirectoryHandle, nextPath = "") {
    setLoading(true);
    setError(null);
    try {
      const entries = await listLocalDirectory(handle, nextPath);
      setPath(nextPath);
      setFiles(entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取文件夹失败");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSupported(isLocalFolderSupported());
    void (async () => {
      try {
        const restored = await restoreLocalFolder();
        if (restored) {
          setRoot(restored.handle);
          setMeta(restored.meta);
          await loadDir(restored.handle, "");
        }
      } catch {
        // permission revoked — user must re-link
      }
    })();
  }, []);

  async function handleLink() {
    try {
      const { handle, meta: nextMeta } = await pickLocalFolder();
      setRoot(handle);
      setMeta(nextMeta);
      await loadDir(handle, "");
      startTransition(async () => {
        await saveLocalFolderLink(
          nextMeta.name === "G:" || nextMeta.name.toLowerCase().includes("google")
            ? SUGGESTED_LOCAL_FOLDER_LABEL
            : `${SUGGESTED_LOCAL_FOLDER_LABEL} · ${nextMeta.name}`
        );
        toast({
          title: "已链接本机文件夹",
          description: "请确认选的是 Google Drive 本地盘 G:\\",
          variant: "success",
        });
        router.refresh();
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast({
        title: "链接失败",
        description: e instanceof Error ? e.message : "请用 Chrome/Edge 重试",
        variant: "error",
      });
    }
  }

  async function handleUnlink() {
    await clearLocalFolderLink();
    setRoot(null);
    setMeta(null);
    setFiles([]);
    setPath("");
    startTransition(async () => {
      await disconnectLocalFolderLink();
      toast({ title: "已断开本机文件夹", variant: "success" });
      router.refresh();
    });
  }

  const crumbs = path ? path.split("/").filter(Boolean) : [];
  const linked = Boolean(root) || Boolean(serverLinkedName);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          本机 Google Drive（G:\）
        </CardTitle>
        <CardDescription>
          文件留在本机 Google Drive 盘。Word / Excel / PPT 用本机 Office
          打开；PDF / 图片在浏览器预览。请用 Chrome / Edge。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported ? (
          <p className="text-sm text-amber-700">
            当前浏览器不支持本机文件夹授权，请改用 Chrome 或 Edge 打开本站。
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {linked ? (
              <>
                <Badge variant="secondary">
                  已链接
                  {meta?.name || serverLinkedName
                    ? ` · ${meta?.name || serverLinkedName}`
                    : ""}
                </Badge>
                <Button type="button" variant="outline" size="sm" onClick={() => void handleLink()}>
                  更换文件夹
                </Button>
                {root && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadDir(root, path)}
                  >
                    刷新
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => void handleUnlink()}
                >
                  断开
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => void handleLink()}>
                <FolderOpen className="h-4 w-4" />
                选择 G:\ 并链接
              </Button>
            )}
          </div>
        )}

        {root && meta && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="min-w-[16rem] flex-1 space-y-1">
              <Label htmlFor="local_root_path">本机绝对路径（Office 直接打开用）</Label>
              <Input
                id="local_root_path"
                value={meta.rootAbsolutePath}
                onChange={(e) => setMeta({ ...meta, rootAbsolutePath: e.target.value })}
                placeholder="例如 G:\CCIC"
              />
              <p className="text-xs text-slate-500">
                当前授权文件夹是「{meta.name}」。若在 G 盘下，一般填{" "}
                <code className="rounded bg-white px-1">G:\{meta.name}</code>
                。路径不对时 Office 可能打不开。
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void updateLocalFolderMeta({ rootAbsolutePath: meta.rootAbsolutePath }).then(() =>
                  toast({ title: "已保存本机路径", variant: "success" })
                )
              }
            >
              保存路径
            </Button>
          </div>
        )}

        {root && (
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
              <button
                type="button"
                className="hover:text-slate-900"
                onClick={() => void loadDir(root, "")}
              >
                {meta?.name || "G:"}
              </button>
              {crumbs.map((seg, i) => {
                const next = crumbs.slice(0, i + 1).join("/");
                return (
                  <span key={next} className="inline-flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5" />
                    <button
                      type="button"
                      className="hover:text-slate-900"
                      onClick={() => void loadDir(root, next)}
                    >
                      {seg}
                    </button>
                  </span>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-52 space-y-2">
                <Label>加入索引时的分类</Label>
                <Select value={docType} onValueChange={setDocType}>
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
              </div>
              <div className="min-w-[12rem] flex-1 space-y-2">
                <Label>关联项目</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">无</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">正在读取本机文件夹…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : files.length === 0 ? (
              <p className="text-sm text-slate-500">此目录为空</p>
            ) : (
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {files.map((file) => (
                  <li
                    key={file.path}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {file.isDir ? (
                        <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {file.isDir
                            ? "文件夹"
                            : file.size != null
                              ? `${file.size} bytes`
                              : "文件"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {file.isDir ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void loadDir(root, file.path)}
                        >
                          打开
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleOpenEntry(file)}
                          >
                            打开
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                              const formData = new FormData();
                              formData.set("provider_file_id", file.path);
                              formData.set("file_name", file.name);
                              if (file.size != null) {
                                formData.set("file_size", String(file.size));
                              }
                              formData.set("doc_type", docType);
                              formData.set("project_id", projectId);
                              startTransition(async () => {
                                try {
                                  await addLocalFolderDocument(formData);
                                  toast({ title: "已加入文档索引", variant: "success" });
                                  router.refresh();
                                } catch (err) {
                                  toast({
                                    title: "加入失败",
                                    description:
                                      err instanceof Error ? err.message : "请重试",
                                    variant: "error",
                                  });
                                }
                              });
                            }}
                          >
                            加入索引
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!root && serverLinkedName && supported && (
          <p className="text-sm text-slate-500">
            云端已记录链接「{serverLinkedName}」，但本浏览器尚未授权。请再点一次「选择 G:\
            并链接」。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
