import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Returns the signed-in user, or null. Always verifies with Supabase Auth. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

/**
 * Server-side authorization guard. Use in pages and Server Actions that need
 * a real user; a proxy redirect is only an optimistic first layer.
 */
export async function requireUser(next = "/dashboard"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const query = new URLSearchParams({ next });
    redirect(`${getSiteUrl()}/login?${query.toString()}`);
  }
  return user;
}
