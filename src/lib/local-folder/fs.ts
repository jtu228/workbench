/** Client-only helpers for linking a local / synced drive folder (e.g. Google Drive G:\). */

const DB_NAME = "workbench-local-folder";
const STORE = "handles";
const ROOT_KEY = "root";

export const SUGGESTED_LOCAL_FOLDER_LABEL = "Google Drive (G:)";
export const DEFAULT_DRIVE_LETTER = "G:";

export type LocalFolderMeta = {
  name: string;
  suggestedLabel: string;
  linkedAt: string;
  /** Absolute Windows path of the linked root, e.g. G:\\ or G:\\CCIC */
  rootAbsolutePath: string;
};

export type LocalEntry = {
  path: string;
  name: string;
  isDir: boolean;
  size: number | null;
  lastModified: number | null;
};

export type OpenLocalResult = {
  mode: "office" | "browser" | "download";
  file: File;
  absolutePath?: string;
};

function supportsDirectoryPicker() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB 打开失败"));
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error ?? new Error("读取失败"));
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("写入失败"));
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("删除失败"));
  });
}

export function isLocalFolderSupported() {
  return supportsDirectoryPicker();
}

/** Infer G:\... absolute path from the picked folder name. */
export function inferRootAbsolutePath(folderName: string) {
  const name = folderName.trim();
  if (/^[A-Za-z]:$/.test(name)) return `${name}\\`;
  if (/^[A-Za-z]:\\/.test(name)) return name.endsWith("\\") ? name : `${name}\\`;
  if (/^google\s*drive$/i.test(name)) return `${DEFAULT_DRIVE_LETTER}\\`;
  return `${DEFAULT_DRIVE_LETTER}\\${name}`;
}

export function joinAbsolutePath(rootAbsolutePath: string, relativePath: string) {
  const root = rootAbsolutePath.replace(/[/\\]+$/, "");
  const parts = relativePath.split(/[/\\]+/).filter(Boolean);
  if (parts.length === 0) return root;
  return [root, ...parts].join("\\");
}

/** file:///G:/folder/file.xlsx — RFC 8089 style for Office URI handlers */
export function toOfficeFileUrl(absoluteWindowsPath: string) {
  const normalized = absoluteWindowsPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return "file:///";
  const drive = parts[0];
  const rest = parts.slice(1).map((seg) => encodeURIComponent(seg)).join("/");
  const path = rest ? `${drive}/${rest}` : drive;
  return `file:///${path}`;
}

export function getAbsolutePathForEntry(
  relativePath: string,
  rootAbsolutePath: string,
  rootName?: string
) {
  const absRoot = rootAbsolutePath || inferRootAbsolutePath(rootName || "");
  return joinAbsolutePath(absRoot, relativePath);
}

function officeSchemeForName(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls", "xlsm", "xlsb", "csv"].includes(ext)) return "ms-excel";
  if (["docx", "doc", "docm", "rtf"].includes(ext)) return "ms-word";
  if (["pptx", "ppt", "pptm"].includes(ext)) return "ms-powerpoint";
  if (["vsdx", "vsd"].includes(ext)) return "ms-visio";
  if (["accdb", "mdb"].includes(ext)) return "ms-access";
  return null;
}

function isBrowserPreviewable(file: File) {
  const type = file.type || "";
  if (type.startsWith("image/") || type.startsWith("text/") || type.startsWith("audio/") || type.startsWith("video/")) {
    return true;
  }
  if (type === "application/pdf") return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "txt", "md", "html", "htm"].includes(ext);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function tryLaunchOfficeUri(uri: string) {
  const opened = window.open(uri, "_blank");
  if (!opened) {
    window.location.href = uri;
  }
}

function launchOfficeLocal(absolutePath: string, fileName: string) {
  const scheme = officeSchemeForName(fileName);
  if (!scheme) return false;
  const fileUrl = toOfficeFileUrl(absolutePath);
  const uris = [
    `${scheme}:ofe|u|${fileUrl}`,
    `${scheme}:ofv|u|${fileUrl}`,
    `ms-office:ofe|u|${fileUrl}`,
  ];
  for (const uri of uris) {
    tryLaunchOfficeUri(uri);
  }
  return true;
}

export async function getStoredRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirectoryPicker()) return null;
  return idbGet<FileSystemDirectoryHandle>(ROOT_KEY);
}

export async function getStoredLocalMeta(): Promise<LocalFolderMeta | null> {
  return idbGet<LocalFolderMeta>("meta");
}

export async function updateLocalFolderMeta(patch: Partial<LocalFolderMeta>) {
  const current = (await getStoredLocalMeta()) ?? {
    name: "本地文件夹",
    suggestedLabel: SUGGESTED_LOCAL_FOLDER_LABEL,
    linkedAt: new Date().toISOString(),
    rootAbsolutePath: `${DEFAULT_DRIVE_LETTER}\\`,
  };
  const next = { ...current, ...patch };
  await idbSet("meta", next);
  return next;
}

export async function clearLocalFolderLink() {
  await idbDel(ROOT_KEY);
  await idbDel("meta");
}

async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  mode: "read" | "readwrite" = "read"
) {
  const opts: FileSystemHandlePermissionDescriptor = { mode };
  const current = (await handle.queryPermission?.(opts)) ?? "prompt";
  if (current === "granted") return true;
  const next = (await handle.requestPermission?.(opts)) ?? "denied";
  return next === "granted";
}

/** Prompt user to pick a folder. Prefer selecting Google Drive G:\ root. */
export async function pickLocalFolder(): Promise<{
  handle: FileSystemDirectoryHandle;
  meta: LocalFolderMeta;
}> {
  if (!supportsDirectoryPicker()) {
    throw new Error("当前浏览器不支持本机文件夹（请用 Chrome 或 Edge）");
  }

  const handle = await window.showDirectoryPicker({
    id: "workbench-google-drive-g",
    mode: "read",
    startIn: "documents",
  });

  const ok = await ensurePermission(handle, "read");
  if (!ok) throw new Error("未获得文件夹读取权限");

  const meta: LocalFolderMeta = {
    name: handle.name,
    suggestedLabel: SUGGESTED_LOCAL_FOLDER_LABEL,
    linkedAt: new Date().toISOString(),
    rootAbsolutePath: inferRootAbsolutePath(handle.name),
  };
  await idbSet(ROOT_KEY, handle);
  await idbSet("meta", meta);
  return { handle, meta };
}

export async function restoreLocalFolder(): Promise<{
  handle: FileSystemDirectoryHandle;
  meta: LocalFolderMeta;
} | null> {
  const handle = await getStoredRootHandle();
  if (!handle) return null;
  const ok = await ensurePermission(handle, "read");
  if (!ok) return null;
  const stored = await getStoredLocalMeta();
  const meta: LocalFolderMeta = stored
    ? {
        ...stored,
        rootAbsolutePath:
          stored.rootAbsolutePath || inferRootAbsolutePath(stored.name || handle.name),
      }
    : {
        name: handle.name,
        suggestedLabel: SUGGESTED_LOCAL_FOLDER_LABEL,
        linkedAt: new Date().toISOString(),
        rootAbsolutePath: inferRootAbsolutePath(handle.name),
      };
  return { handle, meta };
}

export async function resolveRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
  const parts = relativePath.split(/[/\\]+/).filter(Boolean);
  if (parts.length === 0) return root;

  let current: FileSystemDirectoryHandle = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    if (isLast) {
      try {
        return await current.getFileHandle(part);
      } catch {
        return await current.getDirectoryHandle(part);
      }
    }
    current = await current.getDirectoryHandle(part);
  }
  return current;
}

export async function listLocalDirectory(
  root: FileSystemDirectoryHandle,
  relativePath = ""
): Promise<LocalEntry[]> {
  let dir = root;
  if (relativePath) {
    const parts = relativePath.split(/[/\\]+/).filter(Boolean);
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
  }

  const entries: LocalEntry[] = [];
  for await (const [name, handle] of dir.entries()) {
    const path = relativePath ? `${relativePath}/${name}` : name;
    if (handle.kind === "directory") {
      entries.push({
        path,
        name,
        isDir: true,
        size: null,
        lastModified: null,
      });
    } else {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        entries.push({
          path,
          name,
          isDir: false,
          size: file.size,
          lastModified: file.lastModified,
        });
      } catch {
        entries.push({
          path,
          name,
          isDir: false,
          size: null,
          lastModified: null,
        });
      }
    }
  }

  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, "zh");
  });
  return entries;
}

export async function readLocalFile(
  root: FileSystemDirectoryHandle,
  relativePath: string
) {
  const handle = await resolveRelativePath(root, relativePath);
  if (handle.kind !== "file") {
    throw new Error("目标不是文件");
  }
  return (handle as FileSystemFileHandle).getFile();
}

export function isOfficeFileName(fileName: string) {
  return Boolean(officeSchemeForName(fileName));
}

export function launchLocalOffice(
  relativePath: string,
  fileName: string,
  rootAbsolutePath?: string
) {
  const absRoot = rootAbsolutePath || `${DEFAULT_DRIVE_LETTER}\\`;
  const absolutePath = joinAbsolutePath(absRoot, relativePath);
  if (!launchOfficeLocal(absolutePath, fileName)) {
    throw new Error("无法识别的 Office 文件类型");
  }
}

/**
 * Open strategy:
 * 1. Word / Excel / PPT → launch local Office on G:\ path (+ copy path fallback)
 * 2. PDF / images → browser preview tab
 * 3. Other → blob open (may download)
 */
export async function openLocalFile(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  rootAbsolutePath?: string
): Promise<OpenLocalResult> {
  const file = await readLocalFile(root, relativePath);

  const meta = rootAbsolutePath
    ? { rootAbsolutePath }
    : (await getStoredLocalMeta()) ?? null;
  const absRoot =
    meta?.rootAbsolutePath ||
    inferRootAbsolutePath((await getStoredLocalMeta())?.name || root.name);

  if (officeSchemeForName(file.name) && absRoot) {
    const absolutePath = joinAbsolutePath(absRoot, relativePath);
    const launched = launchOfficeLocal(absolutePath, file.name);
    if (launched) {
      const copied = await copyText(absolutePath);
      return { mode: "office", file, absolutePath: copied ? absolutePath : undefined };
    }
  }

  if (isBrowserPreviewable(file)) {
    const url = URL.createObjectURL(file);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    if (!win) {
      throw new Error("浏览器拦截了预览窗口，请允许弹窗后重试");
    }
    return { mode: "browser", file };
  }

  const url = URL.createObjectURL(file);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    return { mode: "download", file };
  }
  return { mode: "download", file };
}
