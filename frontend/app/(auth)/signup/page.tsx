import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/utils";
import { getAppUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Create account · Leafwise" };

export const instant = false;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next: requestedNext }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const next = safeNext(requestedNext);

  if (user) {
    redirect(`${getAppUrl()}${next}`);
  }

  return <AuthForm mode="signup" next={next} />;
}
