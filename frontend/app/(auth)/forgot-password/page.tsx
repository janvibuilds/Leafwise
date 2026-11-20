import type { Metadata } from "next";
import PasswordForm from "@/components/auth/PasswordForm";

export const metadata: Metadata = { title: "Reset password · Leafwise" };

export default function ForgotPasswordPage() {
  return <PasswordForm mode="forgot" />;
}
