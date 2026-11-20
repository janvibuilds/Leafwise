"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/lib/auth/actions";

type PasswordFormProps = {
  mode: "forgot" | "reset";
};

export default function PasswordForm({ mode }: PasswordFormProps) {
  const action = mode === "forgot" ? requestPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );
  const isForgot = mode === "forgot";

  return (
    <div className="w-full max-w-[440px]">
      <h1 className="font-display text-[40px] leading-[1.1] text-ink">
        {isForgot ? "Reset your password" : "Choose a new password"}
      </h1>
      <p className="mt-3 text-[16px] leading-6 text-ink/70">
        {isForgot
          ? "We'll email you a secure link to choose a new password."
          : "Use at least 8 characters. This will replace your current password."}
      </p>

      <form action={formAction} className="mt-9 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">
            {isForgot ? "Email" : "New password"}
          </span>
          <input
            name={isForgot ? "email" : "password"}
            type={isForgot ? "email" : "password"}
            autoComplete={isForgot ? "email" : "new-password"}
            required
            minLength={isForgot ? undefined : 8}
            placeholder={isForgot ? "you@example.com" : "At least 8 characters"}
            className="h-12 rounded-xl border border-ink/15 bg-white px-4 text-[16px] outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
          />
        </label>

        <div aria-live="polite" className="min-h-6 text-[14px]">
          {state?.error && <p className="text-red-700">{state.error}</p>}
          {state?.message && <p className="text-teal">{state.message}</p>}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-full bg-ink px-6 text-[16px] font-medium text-paper transition hover:bg-night disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Please wait…"
            : isForgot
              ? "Send reset link"
              : "Update password"}
        </button>
      </form>

      <p className="mt-8 text-[14px] text-ink/70">
        <Link href="/login" className="font-medium text-teal hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
