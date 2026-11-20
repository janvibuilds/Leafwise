import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getCookieDomain,
  getSupabaseConfig,
  shouldUseSecureCookies,
} from "@/lib/env";

/**
 * Server Supabase client for Server Components, Server Actions and Route
 * Handlers. Cookie writes are wrapped because Server Components cannot set
 * cookies; Server Actions and Route Handlers can.
 */
export async function createClient() {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the proxy refreshes the session.
        }
      },
    },
    cookieOptions: {
      domain: getCookieDomain(),
      path: "/",
      sameSite: "lax",
      secure: shouldUseSecureCookies(),
    },
  });
}
