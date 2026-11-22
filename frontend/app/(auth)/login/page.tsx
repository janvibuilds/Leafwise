import { connection } from "next/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/auth/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in · Leafwise" };

// Reads the session cookie at request time.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await connection();
  const [{ next: requestedNext }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const next = safeNext(requestedNext);

  if (user) {
    redirect(`${getAppUrl()}${next}`);
  }

  return <AuthForm mode="login" next={next} />;
}
