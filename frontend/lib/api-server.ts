import { createApiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/server";

async function getServerToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Use in Server Components and Server Actions. */
export const serverApi = createApiClient(getServerToken);
