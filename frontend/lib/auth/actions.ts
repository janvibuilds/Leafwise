"use server";

import { redirect } from "next/navigation";
import { getAppUrl, getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError, safeNext } from "@/lib/auth/utils";

export type AuthState = { error?: string; message?: string } | undefined;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function callbackUrl(next: string): string {
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signIn(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect(`${getAppUrl()}${next}`);
}

export async function signUp(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const fullName = text(formData, "fullName");
  const next = safeNext(formData.get("next"));

  if (!email || !password || !fullName) {
    return { error: "Enter your name, email and password." };
  }
  if (password.length < 8) {
    return { error: "Choose a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: callbackUrl(next),
    },
  });
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  // With email confirmation disabled, Supabase returns an active session.
  if (data.session) {
    redirect(`${getAppUrl()}${next}`);
  }

  return {
    message: "Check your inbox to confirm your email, then sign in.",
  };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(next),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    redirect(`${getSiteUrl()}/login?error=oauth_failed`);
  }
  redirect(data.url);
}

export async function requestPasswordReset(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email");
  if (!email) {
    return { error: "Enter your email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = text(formData, "password");
  if (password.length < 8) {
    return { error: "Choose a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect(`${getAppUrl()}/dashboard`);
}

export async function updateProfile(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = text(formData, "fullName");
  if (!fullName) {
    return { error: "Enter a display name." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }
  return { message: "Your profile has been saved." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getSiteUrl());
}
