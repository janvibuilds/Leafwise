import { connection } from "next/server";
import type { Metadata } from "next";
import ClassesGallery, { type CropGroup } from "@/components/classes/ClassesGallery";
import PageHeader from "@/components/app/PageHeader";
import { serverApi } from "@/lib/api-server";

export const metadata: Metadata = { title: "38 Classes · Leafwise" };
export const instant = false;

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ plant?: string; q?: string }>;
}) {
  await connection();
  const [{ plant, q }] = await Promise.all([searchParams]);

  let groups: CropGroup[] = [];
  let errorMessage: string | null = null;
  try {
    const response = await serverApi.listDiseases();
    const byPlant = new Map<string, string[]>();
    for (const disease of response.diseases) {
      const list = byPlant.get(disease.plant) ?? [];
      list.push(disease.condition);
      byPlant.set(disease.plant, list);
    }
    groups = Array.from(byPlant, ([name, conditions]: [string, string[]]) => ({
      plant: name,
      conditions,
    })).sort((a, b) => a.plant.localeCompare(b.plant));
  } catch {
    errorMessage = "The class library could not be loaded. Please try again.";
  }

  return (
    <>
      <PageHeader title="38 Classes" />
      <div className="mb-7 max-w-[720px]">
        <p className="text-[13px] font-semibold text-muted">Know what you&apos;re growing.</p>
        <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.03em] text-forest sm:text-[32px]">
          Explore the supported classes
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-muted">
          Explore {groups.length || 14} plant and disease classes across the model&apos;s supported crops.
        </p>
      </div>
      {errorMessage ? (
        <p role="alert" className="app-card px-5 py-4 text-[14px] text-[#a33b28]">
          {errorMessage}
        </p>
      ) : (
        <ClassesGallery groups={groups} initialPlant={plant} initialQuery={q} />
      )}
      <p className="app-card mt-6 px-6 py-5 text-[13px] leading-6 text-muted">
        <strong className="text-forest">A focused library. A clearer starting point.</strong> Matches are
        limited to these supported crops and conditions. An unfamiliar plant may not return a reliable match.
      </p>
    </>
  );
}
