"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useAppUser } from "@/components/app/AppContext";
import { Icon } from "@/components/app/icons";
import { apiClient } from "@/lib/api-browser";
import { updateProfile } from "@/lib/auth/actions";

export default function SettingsForm() {
  const { user } = useAppUser();
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  const [gardenType, setGardenType] = useState("Home garden");
  const [language, setLanguage] = useState("English");
  const [country, setCountry] = useState("Not set");
  const [scanUpdates, setScanUpdates] = useState(true);
  const [productNews, setProductNews] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = window.localStorage;
      setGardenType(stored.getItem("leafwise:garden-type") ?? "Home garden");
      setLanguage(stored.getItem("leafwise:language") ?? "English");
      setCountry(stored.getItem("leafwise:country") ?? "Not set");
      setScanUpdates(stored.getItem("leafwise:scan-updates") !== "false");
      setProductNews(stored.getItem("leafwise:product-news") === "true");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function savePreference(key: string, value: string) {
    window.localStorage.setItem(key, value);
  }

  async function downloadData() {
    setDownloading(true);
    setNotice(null);
    try {
      const rows = await apiClient.listPredictions({ limit: 100 });
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), predictions: rows }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "leafwise-predictions.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice("Your data could not be downloaded right now.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="app-card p-7">
          <h2 className="text-[20px] font-bold text-forest">Your profile</h2>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Image src="/images/avatar.webp" alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold text-forest">{user.name}</p>
              <p className="text-[13px] text-muted">A familiar face for your workspace.</p>
            </div>
            <button
              type="button"
              onClick={() => setNotice("Avatar uploads are not available in this demo.")}
              className="app-btn-quiet px-5 py-2.5 text-[13px]"
            >
              Change photo
            </button>
          </div>

          <form action={formAction} className="mt-7 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="app-label" htmlFor="display-name">Display name</label>
              <input id="display-name" name="fullName" className="app-input" defaultValue={user.name} />
            </div>
            <div>
              <label className="app-label" htmlFor="garden-type">Garden type</label>
              <select
                id="garden-type"
                className="app-input"
                value={gardenType}
                onChange={(event) => {
                  setGardenType(event.target.value);
                  savePreference("leafwise:garden-type", event.target.value);
                }}
              >
                {["Home garden", "Community garden", "Farm", "Greenhouse", "Balcony"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="app-label" htmlFor="email">Email address</label>
              <input id="email" className="app-input bg-soft" value={user.email} readOnly />
            </div>
            <div>
              <label className="app-label" htmlFor="language">Language</label>
              <select
                id="language"
                className="app-input"
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  savePreference("leafwise:language", event.target.value);
                }}
              >
                {["English", "Hindi", "Spanish"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="app-label" htmlFor="country">Country or region</label>
              <select
                id="country"
                className="app-input"
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  savePreference("leafwise:country", event.target.value);
                }}
              >
                {["Not set", "India", "United States", "United Kingdom", "Other"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <button type="submit" disabled={pending} className="app-btn-primary px-6 py-3 text-[14px]">
                {pending ? "Saving…" : "Save changes"}
              </button>
              <p className="text-[13px] text-muted">Changes apply to your workspace.</p>
              {state?.error && <p role="alert" className="text-[13px] text-cta">{state.error}</p>}
              {state?.message && <p className="text-[13px] text-[#168a45]">{state.message}</p>}
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="app-card p-7">
            <h2 className="text-[20px] font-bold text-forest">Notifications</h2>
            <div className="mt-6 space-y-6">
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-[14px] font-semibold text-forest">Scan updates</span>
                  <span className="block text-[13px] text-muted">Let me know when an analysis is ready.</span>
                </span>
                <input
                  type="checkbox"
                  checked={scanUpdates}
                  onChange={(event) => {
                    setScanUpdates(event.target.checked);
                    savePreference("leafwise:scan-updates", String(event.target.checked));
                  }}
                  className="mt-1 h-5 w-5 accent-[#1aa67a]"
                />
              </label>
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-[14px] font-semibold text-forest">Product news</span>
                  <span className="block text-[13px] text-muted">Occasional updates from Leafwise.</span>
                </span>
                <input
                  type="checkbox"
                  checked={productNews}
                  onChange={(event) => {
                    setProductNews(event.target.checked);
                    savePreference("leafwise:product-news", String(event.target.checked));
                  }}
                  className="mt-1 h-5 w-5 accent-[#1aa67a]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl bg-forest p-7 text-white">
            <h2 className="text-[22px] font-bold">Private by nature.</h2>
            <p className="mt-3 text-[14px] leading-6 text-white/70">
              Your scan history is personal. Keep observations in your workspace and choose what you share.
            </p>
            <Link href="/photo-guide#support" className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white hover:underline">
              Read the privacy policy <Icon name="arrowUpRight" size={15} />
            </Link>
          </section>
        </div>
      </div>

      <section className="app-card mt-6 p-7">
        <h2 className="text-[20px] font-bold text-forest">Account &amp; security</h2>
        <p className="mt-2 text-[13px] text-muted">Keep your account secure and stay in control of your data.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/reset-password" className="app-btn-quiet px-5 py-2.5 text-[13px]">Change password</Link>
          <button type="button" onClick={downloadData} disabled={downloading} className="app-btn-quiet px-5 py-2.5 text-[13px]">
            {downloading ? "Preparing…" : "Download my data"}
          </button>
          <button
            type="button"
            onClick={() => setNotice("Account deletion is handled by the project administrator.")}
            className="ml-auto text-[13px] font-semibold text-cta hover:underline"
          >
            Delete account
          </button>
        </div>
        {notice && <p className="mt-4 text-[13px] text-muted">{notice}</p>}
      </section>

      <p className="mt-6 text-[12px] text-muted">Your garden, your observations, your choice.</p>
    </>
  );
}
