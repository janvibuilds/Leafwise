import type { ConfidenceState } from "@/lib/types";

const labels: Record<ConfidenceState, string> = {
  high: "High confidence",
  review_recommended: "Review recommended",
  uncertain: "Uncertain",
};

const styles: Record<ConfidenceState, string> = {
  high: "bg-teal/15 text-[#0d6f55] border-teal/30",
  review_recommended: "bg-amber-100 text-amber-800 border-amber-300",
  uncertain: "bg-red-50 text-red-700 border-red-200",
};

export default function ConfidenceBadge({ state }: { state: ConfidenceState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium ${styles[state]}`}
    >
      {labels[state]}
    </span>
  );
}
