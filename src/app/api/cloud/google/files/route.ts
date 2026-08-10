import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGoogleAccessTokenForUser,
  listGoogleDriveFiles,
} from "@/lib/cloud/google";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const accessToken = await getGoogleAccessTokenForUser(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "尚未连接 Google Drive" }, { status: 400 });
    }
    const pageToken = new URL(request.url).searchParams.get("pageToken") || undefined;
    const data = await listGoogleDriveFiles(accessToken, pageToken);
    return NextResponse.json({
      files: data.files ?? [],
      nextPageToken: data.nextPageToken ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
