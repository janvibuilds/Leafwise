"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signIn,
  signInWithGoogle,
  signUp,
  type AuthState,
} from "@/lib/auth/actions";

type AuthFormProps = {
  mode: "login" | "signup";
  next?: string;
};

const copy = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to keep scanning and tracking your plants.",
    submit: "Sign in",
    switchText: "New to Leafwise?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start building your leaf-health history in a minute.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login",
  },
} as const;

export default function AuthForm({ mode, next = "/dashboard" }: AuthFormProps) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );
  const text = copy[mode];

  return (
    <div className="w-full max-w-[440px]">
      <h1 className="font-display text-[40px] leading-[1.1] text-ink">
        {text.title}
      </h1>
      <p className="mt-3 text-[16px] leading-6 text-ink/70">{text.subtitle}</p>

      <form action={formAction} className="mt-9 flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />

        {mode === "signup" && (
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-medium text-ink">Full name</span>
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="Your name"
              className="h-12 rounded-xl border border-ink/15 bg-white px-4 text-[16px] outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
            />
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-12 rounded-xl border border-ink/15 bg-white px-4 text-[16px] outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between text-[14px] font-medium text-ink">
            Password
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-[13px] font-normal text-teal hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            placeholder="At least 8 characters"
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
          {pending ? "Please wait…" : text.submit}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4 text-[13px] text-ink/50">
        <span className="h-px flex-1 bg-ink/15" />
        or
        <span className="h-px flex-1 bg-ink/15" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-ink/20 bg-white text-[15px] font-medium text-ink transition hover:bg-bone"
        >
          <span aria-hidden="true" className="text-[18px]">
            G
          </span>
          Continue with Google
        </button>
      </form>

      <p className="mt-8 text-[14px] text-ink/70">
        {text.switchText}{" "}
        <Link
          href={`${text.switchHref}?next=${encodeURIComponent(next)}`}
          className="font-medium text-teal hover:underline"
        >
          {text.switchLabel}
        </Link>
      </p>
    </div>
  );
}
