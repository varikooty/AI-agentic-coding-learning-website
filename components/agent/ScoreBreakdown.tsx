import type { AgentGradeResponse } from "@/lib/agent/types";

const ORDER: (keyof AgentGradeResponse["dimensions"])[] = [
  "correctness",
  "scope",
  "verification",
  "safety",
  "communication",
];

export default function ScoreBreakdown({ dimensions }: { dimensions: AgentGradeResponse["dimensions"] }) {
  return (
    <div className="rounded-lg border border-range-line bg-range-panel p-4">
      <div className="mb-3 text-xs font-mono uppercase tracking-wider text-range-dim/70">Score breakdown</div>
      <div className="space-y-3">
        {ORDER.map((key) => {
          const dim = dimensions[key];
          return (
            <div key={key} title={dim.note}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-range-dim">{dim.label}</span>
                <span className="text-xs font-mono text-range-text">{dim.score}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-sm bg-range-bg">
                <div
                  className="h-full rounded-r-full bg-range-brass"
                  style={{ width: `${Math.max(0, Math.min(100, dim.score))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-range-dim/80 leading-snug">{dim.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
