import Link from "next/link";
import { connection } from "next/server";
import {
  LuHistory,
  LuLayoutDashboard,
  LuLogOut,
  LuScanSearch,
  LuUserRound,
} from "react-icons/lu";
import Brand from "@/components/Brand";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";

export const instant = false;

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LuLayoutDashboard },
  { href: "/predict", label: "New scan", icon: LuScanSearch },
  { href: "/history", label: "History", icon: LuHistory },
  { href: "/profile", label: "Profile", icon: LuUserRound },
];

/** Authenticated application shell, served from the app subdomain. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const user = await requireUser("/dashboard");

  return (
    <div className="min-h-screen bg-bone text-ink lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-ink/10 bg-paper px-6 py-6 lg:min-h-screen lg:border-r lg:border-b-0 lg:px-7 lg:py-9">
        <Link
          href="/dashboard"
          className="w-fit font-display text-[30px] leading-none text-ink"
        >
          <Brand />
        </Link>
        <p className="mt-2 text-[12px] tracking-[0.18em] text-ink/45 uppercase">
          Plant workspace
        </p>

        <nav aria-label="Application" className="mt-9 flex gap-2 lg:flex-col">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-ink/75 transition hover:bg-bone hover:text-ink"
            >
              <item.icon
                aria-hidden="true"
                size={20}
                className="shrink-0 text-teal"
              />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden pt-10 lg:block">
          <div className="rounded-2xl border border-ink/10 bg-bone/60 p-4">
            <p className="truncate text-[14px] font-medium">{user.email}</p>
            <p className="mt-1 text-[12px] text-ink/55">Signed in</p>
          </div>
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink/15 px-4 py-2.5 text-[14px] font-medium text-ink transition hover:bg-bone"
            >
              <LuLogOut aria-hidden="true" size={16} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-ink/10 bg-paper px-6 py-4 lg:hidden">
          <Link href="/dashboard" className="font-display text-[24px]">
            <Brand />
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium"
            >
              <LuLogOut aria-hidden="true" size={15} />
              Sign out
            </button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-10 sm:px-10 lg:py-14">
          {children}
        </main>
      </div>
    </div>
  );
}
