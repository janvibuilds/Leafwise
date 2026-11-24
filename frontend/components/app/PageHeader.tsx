"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppUser } from "@/components/app/AppContext";
import { Icon } from "@/components/app/icons";
import { apiClient } from "@/lib/api-browser";
import { cropAsset } from "@/lib/plant-assets";
import type { DiseaseInformation, PredictionSummary } from "@/lib/types";

type Panel = "search" | "notifications" | "settings" | "account" | null;

export default function PageHeader({ title }: { title: React.ReactNode }) {
  const { user, signOut } = useAppUser();
  const router = useRouter();
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [diseases, setDiseases] = useState<DiseaseInformation[] | null>(null);
  const [recent, setRecent] = useState<PredictionSummary[] | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState("English");
  const [scanUpdates, setScanUpdates] = useState(true);
  const [productNews, setProductNews] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = window.localStorage;
      setTheme(stored.getItem("leafwise:theme") === "dark" ? "dark" : "light");
      setLanguage(stored.getItem("leafwise:language") ?? "English");
      setScanUpdates(stored.getItem("leafwise:scan-updates") !== "false");
      setProductNews(stored.getItem("leafwise:product-news") === "true");
      try {
        const raw = stored.getItem("leafwise:read-notifications");
        if (raw) setReadIds(JSON.parse(raw) as string[]);
      } catch {
        // ignore malformed local state
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("leafwise:theme", theme);
  }, [theme]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPanel("search");
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (event.key === "Escape") {
        setPanel(null);
        searchRef.current?.blur();
      }
    }
    function onPointer(event: PointerEvent) {
      if (!controlsRef.current?.contains(event.target as Node)) setPanel(null);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  async function loadDiseases() {
    if (diseases) return;
    try {
      const response = await apiClient.listDiseases();
      setDiseases(response.diseases);
    } catch {
      setDiseases([]);
    }
  }

  async function loadRecent() {
    if (recent) return;
    try {
      setRecent(await apiClient.listPredictions({ limit: 3 }));
    } catch {
      setRecent([]);
    }
  }

  function open(next: Panel) {
    if (next === "search") void loadDiseases();
    if (next === "notifications") void loadRecent();
    setPanel((current) => (current === next ? null : next));
  }

  const cropResults = useMemo(() => {
    if (!query.trim() || !diseases) return [];
    const q = query.trim().toLowerCase();
    const counts = new Map<string, number>();
    for (const disease of diseases) {
      if (disease.plant.toLowerCase().includes(q)) {
        counts.set(disease.plant, (counts.get(disease.plant) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).slice(0, 3);
  }, [query, diseases]);

  const conditionResults = useMemo(() => {
    if (!query.trim() || !diseases) return [];
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    return diseases
      .filter((disease) => disease.condition.toLowerCase().includes(q))
      .filter((disease) => {
        if (seen.has(disease.condition)) return false;
        seen.add(disease.condition);
        return true;
      })
      .slice(0, 4);
  }, [query, diseases]);

  function submitSearch() {
    if (!query.trim()) return;
    setPanel(null);
    router.push(`/classes?q=${encodeURIComponent(query.trim())}`);
  }

  const unread = (recent ?? []).filter((row) => !readIds.includes(row.id)).length;

  function togglePreference(key: string, value: boolean) {
    window.localStorage.setItem(key, String(value));
  }

  return (
    <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em] text-forest sm:text-[36px]">
        {title}
      </h1>

      <div ref={controlsRef} className="relative flex flex-wrap items-center justify-start gap-2.5 sm:justify-end sm:gap-3">
        <div className="relative">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPanel("search");
            }}
            onFocus={() => {
              setPanel("search");
              void loadDiseases();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitSearch();
            }}
            placeholder="Search plants or diseases..."
            aria-label="Search plants or diseases"
            className="h-[52px] w-[160px] rounded-xl border border-line bg-surface pl-10 pr-9 text-[13px] text-inkstrong shadow-none outline-none placeholder:text-muted focus:border-sky sm:w-[300px] sm:pl-12 sm:pr-14 sm:text-[14px] lg:w-[360px]"
          />
          <Icon name="search" size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-soft px-2 py-1 text-[11px] font-medium text-muted">
            ⌘ K
          </span>

          {panel === "search" && (
            <div className="app-popover w-[420px] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Search results</h2>
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={() => setPanel(null)}
                  className="text-muted hover:text-forest"
                >
                  <Icon name="close" size={17} />
                </button>
              </div>
              {!query.trim() ? (
                <p className="py-4 text-[13px] text-muted">
                  Search the 38 supported classes by plant or condition.
                </p>
              ) : (
                <>
                  {cropResults.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold tracking-[0.08em] text-muted">CROPS</p>
                      {cropResults.map(([plant, count]) => (
                        <Link
                          key={plant}
                          href={`/classes?plant=${encodeURIComponent(plant)}`}
                          onClick={() => setPanel(null)}
                          className="flex items-center gap-3 rounded-xl bg-soft p-2.5 transition hover:bg-line/60"
                        >
                          <span className="relative h-10 w-10 overflow-hidden rounded-lg bg-white">
                            <Image src={cropAsset(plant).image} alt="" fill sizes="40px" className="object-cover" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-forest">{plant}</span>
                            <span className="block text-[12px] text-muted">
                              {cropAsset(plant).category} · {count} {count === 1 ? "class" : "classes"}
                            </span>
                          </span>
                          <Icon name="arrowUpRight" size={17} className="text-muted" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {conditionResults.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <p className="text-[11px] font-bold tracking-[0.08em] text-muted">CONDITIONS</p>
                      {conditionResults.map((disease) => (
                        <Link
                          key={disease.label}
                          href={`/classes?q=${encodeURIComponent(disease.condition)}`}
                          onClick={() => setPanel(null)}
                          className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-soft"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-forest">
                            <Icon name="focus" size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-forest">{disease.condition}</span>
                            <span className="block text-[12px] text-muted">
                              {disease.plant} · possible condition
                            </span>
                          </span>
                          <Icon name="arrowUpRight" size={17} className="text-muted" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {cropResults.length === 0 && conditionResults.length === 0 && (
                    <p className="py-4 text-[13px] text-muted">
                      No matches for “{query}”. Try a supported plant name.
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
                    <span>{cropResults.length + conditionResults.length} results</span>
                    <button type="button" onClick={submitSearch} className="font-semibold text-forest hover:underline">
                      Enter to view all ↵
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={panel === "notifications"}
            onClick={() => open("notifications")}
            className="relative flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-line bg-surface text-forest transition hover:bg-soft"
          >
            <Icon name="bell" size={21} />
            {unread > 0 && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-cta" />}
          </button>
          {panel === "notifications" && (
            <div className="app-popover w-[360px]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[17px] font-bold text-forest">Notifications</h2>
                  <p className="mt-1 text-[12px] text-muted">
                    {unread} unread {unread === 1 ? "update" : "updates"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReadIds((recent ?? []).map((row) => row.id));
                      window.localStorage.setItem(
                        "leafwise:read-notifications",
                        JSON.stringify((recent ?? []).map((row) => row.id)),
                      );
                    }}
                    className="text-[12px] font-semibold text-forest hover:underline"
                  >
                    Mark all as read
                  </button>
                  <button type="button" aria-label="Close" onClick={() => setPanel(null)} className="text-muted">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                {(recent ?? []).map((row) => (
                  <Link
                    key={row.id}
                    href={`/predictions/${row.id}`}
                    onClick={() => setPanel(null)}
                    className={`flex items-start gap-3 rounded-xl p-3 ${readIds.includes(row.id) ? "" : "bg-soft"}`}
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                      <Image src={cropAsset(row.plant).image} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-forest">
                        Your {row.plant} scan is ready
                      </span>
                      <span className="block text-[12px] text-muted">
                        {row.condition} · {(row.confidence * 100).toFixed(1)}% match
                      </span>
                      <span className="block text-[11px] text-muted">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                    {!readIds.includes(row.id) && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cta" />}
                  </Link>
                ))}
                {recent?.length === 0 && (
                  <p className="py-4 text-[13px] text-muted">
                    You&apos;re all caught up. New scans will appear here.
                  </p>
                )}
                {recent === null && <p className="py-4 text-[13px] text-muted">Loading updates…</p>}
              </div>
              <Link
                href="/history"
                onClick={() => setPanel(null)}
                className="app-btn-quiet mt-4 w-full py-2.5 text-[13px] font-semibold"
              >
                View all activity <Icon name="arrowRight" size={15} />
              </Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Quick settings"
            aria-expanded={panel === "settings"}
            onClick={() => open("settings")}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-line bg-surface text-forest transition hover:bg-soft"
          >
            <Icon name="gear" size={21} />
          </button>
          {panel === "settings" && (
            <div className="app-popover w-[350px]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[17px] font-bold text-forest">Quick settings</h2>
                  <p className="mt-1 text-[12px] text-muted">A few preferences, right where you need them.</p>
                </div>
                <button type="button" aria-label="Close" onClick={() => setPanel(null)} className="text-muted">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <p className="mt-5 text-[11px] font-bold tracking-[0.08em] text-muted">APPEARANCE</p>
              <div className="mt-2 flex rounded-xl bg-soft p-1">
                {(["light", "dark"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-semibold capitalize transition ${
                      theme === value ? "bg-white text-forest shadow-sm" : "text-muted"
                    }`}
                  >
                    <Icon name={value === "light" ? "sun" : "layers"} size={16} />
                    {value}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-[11px] font-bold tracking-[0.08em] text-muted">LANGUAGE</p>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  window.localStorage.setItem("leafwise:language", event.target.value);
                }}
                className="app-input mt-2"
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Spanish</option>
              </select>
              <p className="mt-5 text-[11px] font-bold tracking-[0.08em] text-muted">NOTIFICATIONS</p>
              <div className="mt-2 space-y-3">
                <label className="flex items-center justify-between gap-3 text-[13px]">
                  <span>
                    <span className="block font-semibold text-forest">Scan updates</span>
                    <span className="block text-[12px] text-muted">When a new analysis is ready</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={scanUpdates}
                    onChange={(event) => {
                      setScanUpdates(event.target.checked);
                      togglePreference("leafwise:scan-updates", event.target.checked);
                    }}
                    className="h-5 w-5 accent-[#1aa67a]"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-[13px]">
                  <span>
                    <span className="block font-semibold text-forest">Product news</span>
                    <span className="block text-[12px] text-muted">Occasional updates from Leafwise</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={productNews}
                    onChange={(event) => {
                      setProductNews(event.target.checked);
                      togglePreference("leafwise:product-news", event.target.checked);
                    }}
                    className="h-5 w-5 accent-[#1aa67a]"
                  />
                </label>
              </div>
              <Link href="/settings" onClick={() => setPanel(null)} className="app-btn-primary mt-5 w-full py-3 text-[14px]">
                Open all settings <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Your account"
            aria-expanded={panel === "account"}
            onClick={() => open("account")}
            className="h-[52px] w-[52px] overflow-hidden rounded-full border-2 border-white bg-soft shadow-sm transition hover:border-line"
          >
            <Image src="/images/avatar.webp" alt="" width={52} height={52} className="h-full w-full object-cover" />
          </button>
          {panel === "account" && (
            <div className="app-popover w-[320px] p-5">
              <div className="flex items-center gap-3">
                <Image src="/images/avatar.webp" alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-forest">{user.name}</p>
                  <p className="truncate text-[12px] text-muted">{user.email}</p>
                </div>
              </div>
              <span className="mt-3 inline-block rounded-full bg-soft px-3 py-1 text-[12px] font-medium text-forest">
                Personal workspace
              </span>
              <div className="my-4 h-px bg-line" />
              <div className="space-y-1">
                {[
                  { href: "/profile", label: "My profile", icon: "home" as const },
                  { href: "/settings", label: "Account settings", icon: "settings" as const },
                  { href: "/photo-guide", label: "Photo guide", icon: "image" as const },
                  { href: "/photo-guide#support", label: "Help & support", icon: "shield" as const },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setPanel(null)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-inkstrong hover:bg-soft"
                  >
                    <Icon name={item.icon} size={18} className="text-muted" />
                    <span className="flex-1">{item.label}</span>
                    <Icon name="arrowRight" size={15} className="text-muted" />
                  </Link>
                ))}
              </div>
              <div className="my-4 h-px bg-line" />
              <form action={signOut}>
                <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold text-cta hover:bg-soft">
                  <Icon name="logout" size={18} />
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
