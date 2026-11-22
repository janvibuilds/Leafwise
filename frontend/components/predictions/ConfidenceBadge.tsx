import type { ConfidenceState } from "@/lib/types";

const labels: Record<ConfidenceState, string> = {
  high: "High confidence",
  review_recommended: "Review recommended",
  uncertain: "Uncertain",
};

const colors: Record<ConfidenceState, { background: string; color: string; dot: string }> = {
  high: { background: "#e6f7ec", color: "#168a45", dot: "#25c65a" },
  review_recommended: { background: "#fff4e0", color: "#a35a20", dot: "#f2c94c" },
  uncertain: { background: "#fff0eb", color: "#a33b28", dot: "#ef6545" },
};

export default function ConfidenceBadge({ state }: { state: ConfidenceState }) {
  const style = colors[state];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold"
      style={{ background: style.background, color: style.color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: style.dot }} />
      {labels[state]}
    </span>
  );
}
