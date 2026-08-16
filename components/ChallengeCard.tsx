"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TierBadge from "./TierBadge";
import type { Tier } from "@/lib/types";
import { getBestScore } from "@/lib/progress";

export default function ChallengeCard({
  id,
  title,
  tagline,
  tier,
  gradingType,
}: {
  id: string;
  title: string;
  tagline: string;
  tier: Tier;
  gradingType: string;
}) {
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    setBest(getBestScore(id));
  }, [id]);

  return (
    <Link
      href={`/target/${id}`}
      className="group block rounded-lg border border-range-line bg-range-panel p-5 shadow-target transition hover:border-range-brass/40 hover:bg-range-panel2"
    >
      <div className="flex items-start justify-between gap-3">
        <TierBadge tier={tier} showDistance />
        {best !== null && (
          <span className="rounded-full border border-range-line px-2 py-0.5 text-xs font-mono text-range-dim">
            best {best}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-range-text group-hover:text-range-brass2">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-range-dim leading-relaxed">{tagline}</p>
      <div className="mt-4 text-xs font-mono uppercase tracking-wider text-range-dim/70">
        {gradingType === "judge" ? "judged scoring" : "deterministic scoring"}
      </div>
    </Link>
  );
}
