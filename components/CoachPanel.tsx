"use client";

import { useState } from "react";
import type { GradeResponse } from "@/lib/types";

interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export default function CoachPanel({
  challengeId,
  lastResult,
}: {
  challengeId: string;
  lastResult: GradeResponse | null;
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: "assistant",
      content: "Stuck, or just want a second pair of eyes? Ask me anything about the target — I'll point, not solve.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;

    const nextHistory: CoachMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setDraft("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          mode: "hint",
          history: nextHistory.slice(-12),
          lastResult: lastResult ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coach request failed.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-md border border-range-line bg-range-panel">
      <div className="border-b border-range-line px-3 py-2 text-xs font-mono uppercase tracking-wider text-range-dim">
        Coach
      </div>

      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-md px-3 py-2 text-sm leading-relaxed ${
              m.role === "assistant"
                ? "bg-range-panel2 text-range-text"
                : "ml-auto bg-range-brass/10 text-range-brass2"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-range-dim">Coach is thinking…</div>}
        {error && <div className="text-xs text-range-red">{error}</div>}
      </div>

      <div className="flex gap-2 border-t border-range-line p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Why isn't this working?"
          className="flex-1 rounded border border-range-line bg-range-bg px-2.5 py-1.5 text-sm text-range-text placeholder:text-range-dim/50 focus:border-range-brass/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !draft.trim()}
          className="rounded bg-range-brass/15 px-3 py-1.5 text-sm text-range-brass2 transition hover:bg-range-brass/25 disabled:opacity-40"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
