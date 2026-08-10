import { createClient } from "@/lib/supabase/server";

export const NUTSTORE_DAV_ROOT = "https://dav.jianguoyun.com/dav/";

export type NutstoreEntry = {
  path: string;
  name: string;
  isDir: boolean;
  size: number | null;
  contentType: string | null;
  href: string;
};

function basicAuth(email: string, password: string) {
  const token = Buffer.from(`${email}:${password}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

/** Normalize user path relative to /dav root, e.g. "foo/bar.pdf" */
export function normalizeRelativePath(input: string) {
  let path = input.trim();
  if (!path) return "";
  path = path.replace(/^https?:\/\/dav\.jianguoyun\.com\/dav\/?/i, "");
  path = path.replace(/^\/dav\/?/i, "");
  path = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => decodeURIComponent(seg))
    .join("/");
}

export function davUrlForRelativePath(relativePath: string) {
  const path = normalizeRelativePath(relativePath);
  if (!path) return NUTSTORE_DAV_ROOT;
  return (
    NUTSTORE_DAV_ROOT +
    path
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/")
  );
}

function tagText(xml: string, tag: string) {
  const re = new RegExp(`<(?:[A-Za-z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : null;
}

function hasCollection(xml: string) {
  return /<(?:[A-Za-z0-9_]+:)?resourcetype[^>]*>[\s\S]*<(?:[A-Za-z0-9_]+:)?collection/i.test(
    xml
  );
}

function hrefToRelativePath(href: string) {
  try {
    if (href.startsWith("http")) {
      const u = new URL(href);
      href = u.pathname;
    }
  } catch {
    // keep raw
  }
  const decoded = decodeURIComponent(href);
  return normalizeRelativePath(decoded);
}

export function parsePropfindXml(xml: string, baseRelativePath: string): NutstoreEntry[] {
  const chunks = xml.split(/<(?:[A-Za-z0-9_]+:)?response[\s>]/i).slice(1);
  const base = normalizeRelativePath(baseRelativePath);
  const entries: NutstoreEntry[] = [];

  for (const chunk of chunks) {
    const href = tagText(chunk, "href");
    if (!href) continue;
    const relative = hrefToRelativePath(href);
    if (relative === base) continue; // skip self

    const isDir = hasCollection(chunk);
    const displayName =
      tagText(chunk, "displayname") ||
      relative.split("/").filter(Boolean).pop() ||
      relative;
    const sizeRaw = tagText(chunk, "getcontentlength");
    const contentType = tagText(chunk, "getcontenttype");
    const size = sizeRaw && /^\d+$/.test(sizeRaw) ? Number(sizeRaw) : null;

    entries.push({
      path: relative,
      name: displayName,
      isDir,
      size,
      contentType,
      href: davUrlForRelativePath(relative),
    });
  }

  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, "zh");
  });
  return entries;
}

export async function getNutstoreCredentials(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_cloud_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "nutstore")
    .maybeSingle();
  if (error) throw error;
  if (!data?.account_email || !data.access_token) return null;
  return {
    id: data.id as string,
    email: data.account_email as string,
    password: data.access_token as string,
  };
}

export async function nutstorePropfind(email: string, password: string, relativePath = "") {
  const url = davUrlForRelativePath(relativePath);
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: basicAuth(email, password),
      Depth: "1",
      "Content-Type": "application/xml; charset=utf-8",
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("坚果云认证失败，请检查邮箱与应用密码（不是登录密码）");
  }
  if (res.status === 503) {
    throw new Error("坚果云 WebDAV 暂时限流，请稍后再试");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`读取坚果云失败（${res.status}）：${text.slice(0, 200)}`);
  }

  const xml = await res.text();
  return parsePropfindXml(xml, relativePath);
}

export async function nutstoreFetchFile(email: string, password: string, relativePath: string) {
  const path = normalizeRelativePath(relativePath);
  if (!path) throw new Error("缺少文件路径");
  const url = davUrlForRelativePath(path);
  const res = await fetch(url, {
    headers: { Authorization: basicAuth(email, password) },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("坚果云认证失败");
  }
  if (!res.ok) {
    throw new Error(`下载失败（${res.status}）`);
  }
  return res;
}

export async function verifyNutstoreCredentials(email: string, password: string) {
  await nutstorePropfind(email, password, "");
}
