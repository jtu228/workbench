import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNutstoreCredentials, nutstorePropfind } from "@/lib/cloud/nutstore";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const creds = await getNutstoreCredentials(user.id);
  if (!creds) {
    return NextResponse.json({ error: "尚未连接坚果云" }, { status: 400 });
  }

  const path = request.nextUrl.searchParams.get("path") || "";
  try {
    const files = await nutstorePropfind(creds.email, creds.password, path);
    return NextResponse.json({ path, files });
  } catch (e) {
    const message = e instanceof Error ? e.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
