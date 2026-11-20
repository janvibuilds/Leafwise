/**
 * Public runtime configuration for the frontend.
 *
 * All values are safe to expose to the browser. Never put a Supabase secret
 * key (`sb_secret_...`) in a NEXT_PUBLIC_ variable.
 */

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
}

export function getAppUrl(): string {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://app.localhost:3000",
  );
}

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabasePublishableKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
}

/**
 * Strip the conventional `app.` / `www.` subdomains so two hosts can be
 * compared by their shared base domain (e.g. leafwise.com).
 */
function baseHost(hostname: string): string {
  return hostname.replace(/^(app|www)\./, "");
}

/**
 * Cookie domain shared by the marketing site and the app subdomain.
 *
 * Set NEXT_PUBLIC_COOKIE_DOMAIN explicitly in production if your host naming
 * is unusual. Otherwise it is derived from SITE_URL / APP_URL so a session
 * created on domain.com is also sent to app.domain.com.
 */
export function getCookieDomain(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (configured) {
    return configured.replace(/^\./, "");
  }

  try {
    const siteHost = new URL(getSiteUrl()).hostname;
    const appHost = new URL(getAppUrl()).hostname;
    const siteBase = baseHost(siteHost);
    const appBase = baseHost(appHost);
    if (siteBase === appBase && (siteBase.includes(".") || siteHost === "localhost")) {
      return siteBase;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function shouldUseSecureCookies(): boolean {
  return getSiteUrl().startsWith("https://");
}

export function getSupabaseConfig(): { url: string; key: string } {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Copy frontend/.env.example to frontend/.env.local and fill in the values.",
    );
  }
  return { url, key };
}
