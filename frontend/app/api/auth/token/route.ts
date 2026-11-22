import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Same-origin access-token bridge for client components.
 *
 * The browser reads the current Supabase session from the server (which also
 * owns token refresh) instead of relying on client-side cookie parsing. The
 * token is returned only to the authenticated browser that owns the cookie.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return NextResponse.json(
      { accessToken: null },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
