"use client";

import { useState } from "react";
import Link from "next/link";
import type { GradeResponse, PublicChallenge } from "@/lib/types";
import TierBadge from "./TierBadge";
import PromptEditor from "./PromptEditor";
import ScoreDial from "./ScoreDial";
import ResultsPanel from "./ResultsPanel";
import ReferenceReveal from "./ReferenceReveal";
import CoachPanel from "./CoachPanel";
import { recordAttempt } from "@/lib/progress";

export default function TargetClient({ challenge }: { challenge: PublicChallenge }) {
  const [prompt, setPrompt] = useState(challenge.startingPrompt);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [firing, setFiring] = useState(false);
  const [fireError, setFireError] = useState<string | null>(null);
  const [referenceData, setReferenceData] = useState<{ referencePrompt: string; rationale: string } | null>(
    null
  );
  const [revealLoading, setRevealLoading] = useState(false);

  const isJudge = challenge.gradingType === "judge";
  const editorLabel = isJudge ? "System prompt (edit to harden it)" : "Your prompt";

  async function fire() {
    if (firing) return;
    setFiring(true);
    setFireError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grading failed.");
      setResult(data);
      recordAttempt(challenge.id, data.score);
    } catch (err) {
      setFireError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFiring(false);
    }
  }

  async function reveal() {
    setRevealLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, mode: "reveal" }),
      });
      const data = await res.json();
      if (res.ok) setReferenceData(data);
    } finally {
      setRevealLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="text-sm text-range-dim hover:text-range-brass2">
        ← Back to the range
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <TierBadge tier={challenge.tier} showDistance />
        <span className="text-xs font-mono uppercase tracking-wider text-range-dim/70">
          {isJudge ? "judged scoring" : "deterministic scoring"}
        </span>
      </div>
      <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">{challenge.title}</h1>
      <p className="mt-1 text-range-dim">{challenge.tagline}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="space-y-2 rounded-md border border-range-line bg-range-panel p-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-range-dim/70">Scenario</div>
              <p className="mt-1 text-sm text-range-text/90 leading-relaxed">{challenge.scenario}</p>
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-range-dim/70">Goal</div>
              <p className="mt-1 text-sm text-range-text/90 leading-relaxed">{challenge.goal}</p>
            </div>
          </section>

          <section>
            <div className="mb-2 text-xs font-mono uppercase tracking-wider text-range-dim/70">
              Visible test{challenge.visibleTests.length !== 1 ? "s" : ""}
              {challenge.hiddenTestCount > 0 && (
                <span className="ml-2 text-range-dim/50">
                  + {challenge.hiddenTestCount} hidden until you fire
                </span>
              )}
            </div>
            <div className="space-y-2">
              {challenge.visibleTests.map((t) => (
                <div key={t.id} className="rounded-md border border-range-line bg-range-panel p-3 text-sm">
                  {"input" in t ? (
                    <>
                      <pre className="scroll-thin overflow-x-auto whitespace-pre-wrap font-mono text-xs text-range-text/90">
                        {t.input}
                      </pre>
                      {"checks" in t && (
                        <ul className="mt-2 space-y-0.5 text-xs text-range-dim">
                          {t.checks.map((c, i) => (
                            <li key={i}>· {c}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <div>
                      <span
                        className={`mr-2 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                          t.kind === "attack"
                            ? "border-range-red/30 text-range-red"
                            : t.kind === "ambiguous"
                              ? "border-range-amber/30 text-range-amber"
                              : "border-range-green/30 text-range-green"
                        }`}
                      >
                        {t.kind}
                      </span>
                      <span className="text-range-text/90">{t.message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <PromptEditor
              value={prompt}
              onChange={setPrompt}
              label={editorLabel}
              placeholder="Write your prompt…"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fire}
                disabled={firing || !prompt.trim()}
                className="rounded-md bg-range-brass px-5 py-2 text-sm font-semibold text-range-bg transition hover:bg-range-brass2 disabled:opacity-40"
              >
                {firing ? "Firing…" : "Fire"}
              </button>
              {fireError && <span className="text-sm text-range-red">{fireError}</span>}
            </div>
          </section>

          {result && (
            <section>
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-range-dim/70">
                Results
              </div>
              <ResultsPanel result={result} />
            </section>
          )}

          <section>
            <ReferenceReveal revealed={referenceData} loading={revealLoading} onReveal={reveal} />
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          {result && <ScoreDial score={result.score} shot={result.shot} />}
          <div className="h-96">
            <CoachPanel challengeId={challenge.id} lastResult={result} />
          </div>
        </aside>
      </div>
    </main>
  );
}
