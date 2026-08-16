"use client";

import { useState } from "react";

export default function ReferenceReveal({
  revealed,
  loading,
  onReveal,
}: {
  revealed: { referencePrompt: string; rationale: string } | null;
  loading: boolean;
  onReveal: () => void;
}) {
  const [armed, setArmed] = useState(false);

  if (revealed) {
    return (
      <div className="space-y-3 rounded-md border border-range-brass/25 bg-range-panel p-4">
        <div className="text-xs font-mono uppercase tracking-wider text-range-brass">
          Reference solution
        </div>
        <pre className="scroll-thin overflow-x-auto whitespace-pre-wrap rounded bg-range-bg p-3 font-mono text-sm text-range-text/90">
          {revealed.referencePrompt}
        </pre>
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-range-dim/70">Why it works</div>
          <p className="mt-1 text-sm text-range-dim leading-relaxed">{revealed.rationale}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        onReveal();
      }}
      className="w-full rounded-md border border-dashed border-range-line px-4 py-3 text-sm text-range-dim transition hover:border-range-red/40 hover:text-range-red disabled:opacity-50"
    >
      {loading
        ? "Loading reference…"
        : armed
          ? "Click again to confirm — this reveals the fix"
          : "Give up, show me the fix"}
    </button>
  );
}
