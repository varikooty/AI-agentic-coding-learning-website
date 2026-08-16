"use client";

import { useState } from "react";
import type { GradeResponse } from "@/lib/types";

function TestRow({ outcome, index }: { outcome: GradeResponse["outcomes"][number]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-range-line bg-range-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              outcome.passed ? "bg-range-green/15 text-range-green" : "bg-range-red/15 text-range-red"
            }`}
          >
            {outcome.passed ? "✓" : "✗"}
          </span>
          <span className="text-sm">
            Test {index + 1}
            {!outcome.visible && (
              <span className="ml-2 rounded-full border border-range-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-range-dim">
                hidden
              </span>
            )}
          </span>
        </div>
        <span className="text-xs text-range-dim">{open ? "Hide" : "Details"}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-range-line px-3 py-3 text-sm">
          <p className="text-range-dim">{outcome.detail}</p>
          {outcome.testInput && (
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-range-dim/70">Input</div>
              <pre className="scroll-thin mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-range-bg p-2 font-mono text-xs text-range-text/90">
                {outcome.testInput}
              </pre>
            </div>
          )}
          {outcome.rawOutput && (
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-range-dim/70">
                Claude&apos;s response
              </div>
              <pre className="scroll-thin mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-range-bg p-2 font-mono text-xs text-range-text/90">
                {outcome.rawOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPanel({ result }: { result: GradeResponse }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-range-dim">{result.summary}</p>
      {result.outcomes.map((o, i) => (
        <TestRow key={o.testId} outcome={o} index={i} />
      ))}
    </div>
  );
}
