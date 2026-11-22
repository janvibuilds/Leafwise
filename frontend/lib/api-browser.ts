"use client";

import { createApiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

async function getBrowserToken(): Promise<string | null> {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

/** Use in client components. Attaches the current Supabase access token. */
export const apiClient = createApiClient(getBrowserToken);
