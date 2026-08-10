import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeGoogleCode,
  fetchGoogleUserEmail,
  getGoogleOAuthConfig,
} from "@/lib/cloud/google";

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const origin = appOrigin();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(`${origin}/documents?cloud_error=${encodeURIComponent(error)}`);
  }
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${origin}/documents?cloud_error=invalid_state`);
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.redirect(`${origin}/documents?cloud_error=missing_config`);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    const tokens = await exchangeGoogleCode(code);
    const email = await fetchGoogleUserEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { data: existing } = await supabase
      .from("user_cloud_accounts")
      .select("id, refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google_drive")
      .maybeSingle();

    const payload = {
      user_id: user.id,
      provider: "google_drive" as const,
      account_email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existing?.refresh_token || null,
      token_expires_at: expiresAt,
      metadata: {},
    };

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("user_cloud_accounts")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("user_cloud_accounts").insert(payload);
      if (insertError) throw insertError;
    }

    const res = NextResponse.redirect(`${origin}/documents?cloud=google_connected`);
    res.cookies.set("google_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "connect_failed";
    return NextResponse.redirect(`${origin}/documents?cloud_error=${encodeURIComponent(message)}`);
  }
}
