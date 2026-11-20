/** Only allow same-site relative paths in `next` redirects. */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** Never forward raw provider errors to the browser. */
export function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "That email and password don't match. Please try again.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (normalized.includes("password should be")) {
    return "Choose a password with at least 8 characters.";
  }
  if (normalized.includes("email rate limit") || normalized.includes("over_email_send")) {
    return "Supabase's email limit is reached right now. Wait a little while and try again.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (normalized.includes("redirect url") || normalized.includes("redirect_url")) {
    return "Sign-in is misconfigured. Ask the site owner to allow this redirect URL in Supabase.";
  }
  return "Something went wrong. Please try again.";
}
