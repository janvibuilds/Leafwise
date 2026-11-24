"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/app/icons";
import { cropAsset, type CropCategory } from "@/lib/plant-assets";

export type CropGroup = {
  plant: string;
  conditions: string[];
};

const FILTERS: { label: string; value: CropCategory | "All" }[] = [
  { label: "All crops", value: "All" },
  { label: "Fruit", value: "Fruit" },
  { label: "Vegetables", value: "Vegetable" },
  { label: "Field crops", value: "Field crop" },
];

const CATEGORY_LABEL: Record<CropCategory, string> = {
  Fruit: "FRUIT",
  Vegetable: "VEGETABLE",
  "Field crop": "FIELD CROP",
};

export default function ClassesGallery({
  groups,
  initialPlant,
  initialQuery,
}: {
  groups: CropGroup[];
  initialPlant?: string;
  initialQuery?: string;
}) {
  const [filter, setFilter] = useState<CropCategory | "All">("All");
  const query = initialQuery ?? "";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((group) => {
      if (filter !== "All" && cropAsset(group.plant).category !== filter) return false;
      if (initialPlant && group.plant !== initialPlant) return false;
      if (q && !`${group.plant} ${group.conditions.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [groups, filter, query, initialPlant]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className="app-chip"
              data-active={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted">
          {groups.length} crops · {groups.reduce((sum, group) => sum + group.conditions.length, 0)} classes
        </p>
      </div>

      {initialQuery && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-[13px]">
          <Icon name="search" size={16} className="text-muted" />
          <span>
            Results for <strong className="text-forest">“{initialQuery}”</strong>
          </span>
          <Link href="/classes" className="ml-auto font-semibold text-forest hover:underline">
            Clear
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {visible.map((group) => {
          const asset = cropAsset(group.plant);
          return (
            <Link
              key={group.plant}
              href={`/classes?plant=${encodeURIComponent(group.plant)}`}
              className="app-card-flat group overflow-hidden transition hover:-translate-y-0.5 hover:border-sky"
            >
              <div className="relative h-[180px] w-full bg-soft">
                <Image
                  src={asset.image}
                  alt={group.plant}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 260px"
                  className="object-cover"
                />
                <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] text-forest">
                  {CATEGORY_LABEL[asset.category]}
                </span>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[17px] font-bold text-forest">{group.plant}</h2>
                  <p className="mt-1 text-[12px] text-muted">
                    {group.conditions.length} {group.conditions.length === 1 ? "class" : "classes"} to explore
                  </p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-forest transition group-hover:bg-forest group-hover:text-white">
                  <Icon name="arrowUpRight" size={16} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="app-card mt-6 py-14 text-center">
          <p className="text-[16px] font-semibold text-forest">No classes match that search</p>
          <p className="mt-2 text-[13px] text-muted">Try another plant or condition.</p>
          <Link href="/classes" className="app-btn-quiet mt-5 px-5 py-2.5 text-[13px]">
            Show all crops
          </Link>
        </div>
      )}
    </div>
  );
}
