import type { Tier } from "@/lib/types";

const TIER_STYLES: Record<Tier, { label: string; className: string; distance: string }> = {
  beginner: {
    label: "Beginner",
    className: "bg-range-green/10 text-range-green border-range-green/30",
    distance: "10m",
  },
  intermediate: {
    label: "Intermediate",
    className: "bg-range-amber/10 text-range-amber border-range-amber/30",
    distance: "25m",
  },
  advanced: {
    label: "Advanced",
    className: "bg-range-red/10 text-range-red border-range-red/30",
    distance: "50m",
  },
  expert: {
    label: "Expert",
    className: "bg-range-brass/10 text-range-brass border-range-brass/30",
    distance: "100m",
  },
};

export default function TierBadge({ tier, showDistance = false }: { tier: Tier; showDistance?: boolean }) {
  const style = TIER_STYLES[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide ${style.className}`}
    >
      {style.label}
      {showDistance && <span className="opacity-60">· {style.distance}</span>}
    </span>
  );
}
