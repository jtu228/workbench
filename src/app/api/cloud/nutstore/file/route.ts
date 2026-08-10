import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNutstoreCredentials, nutstoreFetchFile } from "@/lib/cloud/nutstore";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const path = request.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "缺少 path" }, { status: 400 });

  const creds = await getNutstoreCredentials(user.id);
  if (!creds) {
    return NextResponse.json({ error: "尚未连接坚果云" }, { status: 400 });
  }

  try {
    const upstream = await nutstoreFetchFile(creds.email, creds.password, path);
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const fileName = path.split("/").filter(Boolean).pop() || "file";
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "打开失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
