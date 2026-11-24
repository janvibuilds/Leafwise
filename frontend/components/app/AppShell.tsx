"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppContext, type AppUser } from "@/components/app/AppContext";
import { Icon, type IconName } from "@/components/app/icons";

type NavItem = { href: string; label: string; icon: IconName };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/predict", label: "Scan Leaf", icon: "scan" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/classes", label: "38 Classes", icon: "grid" },
  { href: "/photo-guide", label: "Photo Guide", icon: "image" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 text-forest">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft text-forest">
        <Icon name="leaf" size={23} />
      </span>
      <span className="text-[26px] font-bold tracking-[-0.04em]">leafwise</span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Application" className="flex flex-col gap-1.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors"
            style={{
              background: active ? "var(--color-forest)" : "transparent",
              color: active ? "#fff" : "var(--color-inkstrong)",
            }}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({
  signOut,
  pathname,
  onNavigate,
}: {
  signOut: () => Promise<void>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="mt-auto flex flex-col gap-1.5 pt-10">
      <Link
        href="/settings"
        onClick={onNavigate}
        aria-current={pathname === "/settings" ? "page" : undefined}
        className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors"
        style={{
          background: pathname === "/settings" ? "var(--color-forest)" : "transparent",
          color: pathname === "/settings" ? "#fff" : "var(--color-inkstrong)",
        }}
      >
        <Icon name="settings" size={20} />
        Settings
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-[15px] font-medium text-inkstrong transition-colors hover:bg-soft"
        >
          <Icon name="logout" size={20} />
          Logout
        </button>
      </form>
    </div>
  );
}

export default function AppShell({
  user,
  signOut,
  children,
}: {
  user: AppUser;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AppContext.Provider value={{ user, signOut }}>
      <div className="app-root min-h-screen lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-6 py-9 lg:flex">
          <div className="px-3">
            <Logo />
          </div>
          <div className="mt-14">
            <NavLinks pathname={pathname} />
          </div>
          <div className="px-1">
            <SidebarFooter signOut={signOut} pathname={pathname} />
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4 lg:hidden">
            <Logo />
            <button
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-forest"
            >
              <Icon name={menuOpen ? "close" : "menu"} size={21} />
            </button>
          </div>
          {menuOpen && (
            <div className="fixed inset-0 z-30 bg-forest/30 lg:hidden" onClick={() => setMenuOpen(false)}>
              <div
                className="flex h-full w-[276px] flex-col border-r border-line bg-surface px-6 py-8"
                onClick={(event) => event.stopPropagation()}
              >
                <Logo />
                <div className="mt-12">
                  <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
                </div>
                <SidebarFooter
                  signOut={signOut}
                  pathname={pathname}
                  onNavigate={() => setMenuOpen(false)}
                />
              </div>
            </div>
          )}

          <main className="app-scroll min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-14 lg:py-10">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
