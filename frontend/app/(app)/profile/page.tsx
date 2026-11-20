import type { Metadata } from "next";
import AppPlaceholder from "@/components/app/AppPlaceholder";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile · Leafwise" };
export const instant = false;

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  return (
    <AppPlaceholder
      eyebrow="Account"
      title="Your profile"
      description={`Signed in as ${user.email ?? "your account"}. Profile editing and feedback preferences will appear here in the next milestone.`}
    />
  );
}
