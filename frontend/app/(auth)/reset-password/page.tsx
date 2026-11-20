import type { Metadata } from "next";
import PasswordForm from "@/components/auth/PasswordForm";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose password · Leafwise" };

export const instant = false;

/**
 * The auth callback exchanges the recovery code and lands here with an active
 * session. Without one, send the visitor back through the reset request flow.
 */
export default async function ResetPasswordPage() {
  await requireUser("/reset-password");
  return <PasswordForm mode="reset" />;
}
