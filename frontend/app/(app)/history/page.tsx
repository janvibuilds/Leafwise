import type { Metadata } from "next";
import AppPlaceholder from "@/components/app/AppPlaceholder";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "History · Leafwise" };
export const instant = false;

export default async function HistoryPage() {
  await requireUser("/history");
  return (
    <AppPlaceholder
      eyebrow="Your workspace"
      title="Prediction history"
      description="Your past scans will appear here with their confidence state, model version, and a short-lived link to the private image."
    />
  );
}
