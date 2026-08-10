import { createClient } from "@/lib/supabase/server";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!clientId || !clientSecret || !appUrl) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/cloud/google/callback`,
  };
}

export function buildGoogleAuthUrl(state: string) {
  const config = getGoogleOAuthConfig();
  if (!config) throw new Error("未配置 Google OAuth（GOOGLE_CLIENT_ID / SECRET / APP_URL）");

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const config = getGoogleOAuthConfig();
  if (!config) throw new Error("未配置 Google OAuth");

  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google 授权失败：${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  };
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleOAuthConfig();
  if (!config) throw new Error("未配置 Google OAuth");

  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`刷新 Google Token 失败：${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
}

export async function getGoogleAccessTokenForUser(userId: string) {
  const supabase = await createClient();
  const { data: account, error } = await supabase
    .from("user_cloud_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google_drive")
    .maybeSingle();
  if (error) throw error;
  if (!account?.access_token) return null;

  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const stillValid = expiresAt - Date.now() > 60_000;
  if (stillValid) return account.access_token as string;

  if (!account.refresh_token) return account.access_token as string;

  const refreshed = await refreshGoogleAccessToken(account.refresh_token);
  const nextExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from("user_cloud_accounts")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: nextExpires,
    })
    .eq("id", account.id);

  return refreshed.access_token;
}

export async function fetchGoogleUserEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: string;
};

export async function listGoogleDriveFiles(accessToken: string, pageToken?: string) {
  const params = new URLSearchParams({
    pageSize: "30",
    fields:
      "nextPageToken, files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)",
    q: "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
    orderBy: "modifiedTime desc",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${GOOGLE_DRIVE_FILES}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`读取 Google Drive 失败：${text}`);
  }
  return (await res.json()) as {
    files?: GoogleDriveFile[];
    nextPageToken?: string;
  };
}

export function googleFileOpenUrl(file: Pick<GoogleDriveFile, "id" | "webViewLink">) {
  return file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
}
