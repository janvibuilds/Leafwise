import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/utils";
import { getAppUrl, getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** PKCE + OAuth callback: exchange `code` for a cookie session, then route. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${getSiteUrl()}/login?error=invalid_link`);
    }
  }

  // Recovery stays on the main site so the user can set a new password there.
  const destination =
    next === "/reset-password"
      ? `${getSiteUrl()}/reset-password`
      : `${getAppUrl()}${next}`;

  return NextResponse.redirect(destination);
}
