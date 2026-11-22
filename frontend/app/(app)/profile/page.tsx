import { connection } from "next/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/app/PageHeader";
import { Icon } from "@/components/app/icons";
import { serverApi } from "@/lib/api-server";

export const metadata: Metadata = { title: "Profile · Leafwise" };
export const instant = false;

export default async function ProfilePage() {
  await connection();

  let profile: Awaited<ReturnType<typeof serverApi.getMe>> | null = null;
  try {
    profile = await serverApi.getMe();
  } catch {
    // The API may be temporarily unavailable; auth still holds.
  }

  const rows = [
    { label: "Email", value: profile?.email ?? "Unavailable" },
    { label: "Full name", value: profile?.fullName ?? "Not set" },
    { label: "Role", value: profile?.role ?? "user" },
  ];

  return (
    <>
      <PageHeader title="Profile" />
      <div className="mb-7 max-w-[720px]">
        <p className="text-[13px] font-semibold text-muted">Your account.</p>
        <p className="mt-2 text-[16px] leading-6 text-muted">
          Account details come from Supabase Auth and the FastAPI profile endpoint.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="app-card p-7">
          <div className="flex items-center gap-4">
            <Image src="/images/avatar.webp" alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
            <div>
              <p className="text-[18px] font-bold text-forest">{profile?.fullName ?? "Gardener"}</p>
              <p className="text-[13px] text-muted">{profile?.email ?? "Signed in"}</p>
            </div>
          </div>
          <dl className="mt-7 divide-y divide-line border-t border-line">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <dt className="text-[13px] text-muted">{row.label}</dt>
                <dd className="text-[15px] font-medium text-inkstrong capitalize">{row.value}</dd>
              </div>
            ))}
          </dl>
          {!profile && (
            <p className="mt-4 text-[13px] text-muted">Profile details could not be loaded right now.</p>
          )}
        </section>
        <aside className="space-y-5">
          <section className="app-card p-7">
            <h2 className="text-[18px] font-bold text-forest">Keep exploring</h2>
            <div className="mt-5 space-y-2">
              <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium hover:bg-soft">
                <Icon name="settings" size={18} className="text-muted" /> Account settings
              </Link>
              <Link href="/history" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium hover:bg-soft">
                <Icon name="history" size={18} className="text-muted" /> Scan history
              </Link>
              <Link href="/photo-guide" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium hover:bg-soft">
                <Icon name="image" size={18} className="text-muted" /> Photo guide
              </Link>
            </div>
          </section>
          <section className="rounded-2xl bg-forest p-7 text-white">
            <h2 className="text-[20px] font-bold">Private by nature.</h2>
            <p className="mt-3 text-[13px] leading-6 text-white/70">
              Only you can see your saved predictions and their images.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
