import { connection } from "next/server";
import AppShell from "@/components/app/AppShell";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";

export const instant = false;

/** Authenticated application shell, served from the app subdomain. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const user = await requireUser("/dashboard");
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const name = fullName.trim().split(" ")[0] || "Gardener";

  return (
    <AppShell
      user={{ name, email: user.email ?? "" }}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
