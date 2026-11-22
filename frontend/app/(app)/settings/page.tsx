import { connection } from "next/server";
import type { Metadata } from "next";
import PageHeader from "@/components/app/PageHeader";
import SettingsForm from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings · Leafwise" };
export const instant = false;

export default async function SettingsPage() {
  await connection();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="mb-7 max-w-[720px]">
        <p className="text-[13px] font-semibold text-muted">Make yourself at home.</p>
        <p className="mt-2 text-[16px] leading-6 text-muted">
          Manage your profile, preferences, and private workspace.
        </p>
      </div>
      <SettingsForm />
    </>
  );
}
