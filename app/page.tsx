import { challenges } from "@/lib/challenges";
import ChallengeCard from "@/components/ChallengeCard";
import TierBadge from "@/components/TierBadge";
import type { Tier } from "@/lib/types";

const TIER_ORDER: Tier[] = ["beginner", "intermediate", "advanced", "expert"];
const TIER_INTRO: Record<Tier, string> = {
  beginner: "Clarity, specificity, giving context.",
  intermediate: "Few-shot examples, format control, multi-step framing.",
  advanced: "System prompt design, injection resistance, ambiguity handling.",
  expert: "Tool schemas, agentic workflows, long-context and cost tradeoffs.",
};

export default function HomePage() {
  const byTier = TIER_ORDER.map((tier) => ({
    tier,
    items: challenges.filter((c) => c.tier === tier),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-14">
        <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-range-brass">
          The Range
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Practice prompting like it's a sport.
        </h1>
        <p className="mt-3 max-w-2xl text-range-dim leading-relaxed">
          Each target is a real scenario with a hidden rubric. Write a prompt, fire it at Claude,
          and see exactly where it hit — bullseye, inner ring, outer ring, or off the paper. A
          coach sits next to you if you get stuck, but it won't write the shot for you.
        </p>
      </header>

      <div className="space-y-12">
        {byTier.map(({ tier, items }) => (
          <section key={tier}>
            <div className="mb-4 flex items-baseline gap-3">
              <TierBadge tier={tier} showDistance />
              <p className="text-sm text-range-dim">{TIER_INTRO[tier]}</p>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-range-line px-5 py-6 text-sm text-range-dim">
                No targets set up here yet — coming soon.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    tagline={c.tagline}
                    tier={c.tier}
                    gradingType={c.gradingType}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
