import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl, getGoogleOAuthConfig } from "@/lib/cloud/google";

export async function GET() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://workbench.attaboy0328.workers.dev").replace(
    /\/$/,
    ""
  );
  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.redirect(
      `${appUrl}/documents?cloud_error=${encodeURIComponent(
        "请先配置 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、NEXT_PUBLIC_APP_URL"
      )}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
