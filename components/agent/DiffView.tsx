"use client";

import { useState } from "react";
import { lineDiff } from "@/lib/lineDiff";
import type { FileDiffEntry } from "@/lib/agent/types";

export default function DiffView({ diffs }: { diffs: FileDiffEntry[] }) {
  const changed = diffs.filter((d) => d.status !== "unchanged");
  const unchanged = diffs.filter((d) => d.status === "unchanged");
  const [activePath, setActivePath] = useState(changed[0]?.path ?? diffs[0]?.path);
  const active = diffs.find((d) => d.path === activePath);

  if (diffs.length === 0) return null;

  return (
    <div className="rounded-lg border border-range-line bg-range-panel">
      <div className="flex flex-wrap items-center gap-1 border-b border-range-line p-2">
        {changed.map((d) => (
          <button
            key={d.path}
            onClick={() => setActivePath(d.path)}
            className={`rounded px-2 py-1 font-mono text-xs ${
              d.path === active?.path
                ? "bg-range-brass/20 text-range-brass2"
                : "text-range-dim hover:text-range-text"
            }`}
          >
            {d.path} <span className="text-range-dim/60">({d.status})</span>
          </button>
        ))}
        {unchanged.length > 0 && (
          <span className="ml-2 font-mono text-xs text-range-dim/60">
            {unchanged.length} file{unchanged.length > 1 ? "s" : ""} unchanged
          </span>
        )}
      </div>
      {active && (
        <pre className="scroll-thin overflow-x-auto whitespace-pre p-3 font-mono text-xs leading-relaxed">
          {lineDiff(active.before, active.after).map((l, i) => (
            <div
              key={i}
              className={
                l.type === "added"
                  ? "bg-range-green/10 text-range-green"
                  : l.type === "removed"
                    ? "bg-range-red/10 text-range-red"
                    : "text-range-dim"
              }
            >
              {l.type === "added" ? "+ " : l.type === "removed" ? "- " : "  "}
              {l.line}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
