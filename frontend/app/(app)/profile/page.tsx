import { connection } from "next/server";
import type { Metadata } from "next";
import { serverApi } from "@/lib/api-server";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile · Leafwise" };
export const instant = false;

export default async function ProfilePage() {
  await connection();
  await requireUser("/profile");

  let profile: Awaited<ReturnType<typeof serverApi.getMe>> | null = null;
  try {
    profile = await serverApi.getMe();
  } catch {
    // The session is still valid; the API may just be temporarily unavailable.
  }

  return (
    <div>
      <p className="text-[13px] tracking-[0.16em] text-ink/45 uppercase">Account</p>
      <h1 className="mt-3 font-display text-[clamp(32px,4vw,52px)] leading-[1.1]">
        Your profile
      </h1>
      <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-ink/70">
        Account details come from Supabase Auth and the FastAPI profile endpoint.
      </p>

      <dl className="mt-9 max-w-[620px] divide-y divide-ink/10 overflow-hidden rounded-3xl border border-ink/10 bg-paper">
        <div className="px-6 py-5">
          <dt className="text-[12px] text-ink/50">Email</dt>
          <dd className="mt-1 text-[16px] text-ink">{profile?.email ?? "Unavailable"}</dd>
        </div>
        <div className="px-6 py-5">
          <dt className="text-[12px] text-ink/50">Full name</dt>
          <dd className="mt-1 text-[16px] text-ink">{profile?.fullName ?? "Not set"}</dd>
        </div>
        <div className="px-6 py-5">
          <dt className="text-[12px] text-ink/50">Role</dt>
          <dd className="mt-1 text-[16px] text-ink capitalize">{profile?.role ?? "user"}</dd>
        </div>
      </dl>

      {!profile && (
        <p className="mt-5 text-[14px] text-ink/60">
          Profile details could not be loaded from the API right now.
        </p>
      )}
    </div>
  );
}
