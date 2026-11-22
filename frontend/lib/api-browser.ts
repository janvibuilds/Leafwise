"use client";

import { createApiClient } from "@/lib/api-client";

/**
 * Get the Supabase access token from the same-origin route handler. This is
 * more reliable than parsing auth cookies in the browser and works across the
 * marketing/app subdomains because the cookie is shared by the server.
 */
async function getBrowserToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/token", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { accessToken?: string };
    return body.accessToken ?? null;
  } catch {
    return null;
  }
}

/** Use in client components. Attaches the current Supabase access token. */
export const apiClient = createApiClient(getBrowserToken);
