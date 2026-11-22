import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getAppUrl,
  getCookieDomain,
  getSiteUrl,
  getSupabaseConfig,
  shouldUseSecureCookies,
} from "@/lib/env";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

const APP_PATHS = ["/dashboard", "/predict", "/history", "/profile"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Next.js dev normalizes `nextUrl.hostname` to localhost, so use the original
 * Host / X-Forwarded-Host header (also what Vercel sets in production).
 */
/**
 * Force an absolute Location header. Next.js relativizes `NextResponse.redirect`
 * when it believes the target is same-origin, which breaks the jump from a
 * local `app.localhost` subdomain back to `localhost`.
 */
function absoluteRedirect(url: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: { Location: url },
  });
}

function requestHostname(request: NextRequest): string {
  const raw =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const first = raw.split(",")[0]?.trim() ?? "";
  return first.replace(/:\d+$/, "").toLowerCase();
}

/**
 * Next.js 16 Proxy (the renamed `middleware`).
 *
 * Responsibilities:
 * 1. Refresh the Supabase session once per navigation.
 * 2. Serve the dashboard from the app subdomain root (`app.domain.com/`).
 * 3. Keep protected pages on the app subdomain and auth pages on the main site.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const pendingCookies: PendingCookie[] = [];
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        pendingCookies.push(...cookiesToSet);
      },
    },
    cookieOptions: {
      domain: getCookieDomain(),
      path: "/",
      sameSite: "lax",
      secure: shouldUseSecureCookies(),
    },
  });

  // getUser() validates the JWT with Supabase and refreshes it if needed.
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const siteHost = hostname(getSiteUrl());
  const appHost = hostname(getAppUrl());
  const host = requestHostname(request);
  const onAppSubdomain = Boolean(appHost) && appHost !== siteHost && host === appHost;

  let response: NextResponse;

  if (onAppSubdomain) {
    if (pathname === "/") {
      response = NextResponse.rewrite(new URL("/dashboard", request.url), {
        request: { headers: request.headers },
      });
    } else if (isAuthPage(pathname)) {
      // Auth stays on the marketing domain; avoid duplicate sessions per host.
      response = absoluteRedirect(`${getSiteUrl()}${pathname}${search}`);
    } else {
      response = NextResponse.next({ request: { headers: request.headers } });
    }

    if (!user && (pathname === "/" || isAppPath(pathname))) {
      const next = pathname === "/" ? "/dashboard" : pathname;
      const query = new URLSearchParams({ next });
      response = absoluteRedirect(`${getSiteUrl()}/login?${query}`);
    }
  } else {
    if (isAppPath(pathname)) {
      response = absoluteRedirect(`${getAppUrl()}${pathname}${search}`);
    } else if (user && isAuthPage(pathname)) {
      // Preserve `next` so a bounced 401 returns to the page the user was on.
      const requested = new URLSearchParams(search.replace(/^\?/, "")).get("next");
      const destination =
        requested && requested.startsWith("/") && !requested.startsWith("//")
          ? requested
          : "/dashboard";
      response = absoluteRedirect(`${getAppUrl()}${destination}`);
    } else {
      response = NextResponse.next({ request: { headers: request.headers } });
    }
  }

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
