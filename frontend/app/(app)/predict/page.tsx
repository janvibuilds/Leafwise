import type { Metadata } from "next";
import AppPlaceholder from "@/components/app/AppPlaceholder";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New scan · Leafwise" };
export const instant = false;

export default async function PredictPage() {
  await requireUser("/predict");
  return (
    <AppPlaceholder
      eyebrow="New scan"
      title="Scan a leaf"
      description="Choose one clear leaf photo. The classifier will return the top three matches, a confidence state, and guidance on what to do next."
    />
  );
}
