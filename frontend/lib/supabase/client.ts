import { createBrowserClient } from "@supabase/ssr";
import {
  getCookieDomain,
  getSupabaseConfig,
  shouldUseSecureCookies,
} from "@/lib/env";

/** Browser Supabase client. Sessions live in cookies, not localStorage. */
export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key, {
    cookieOptions: {
      domain: getCookieDomain(),
      path: "/",
      sameSite: "lax",
      secure: shouldUseSecureCookies(),
    },
  });
}
