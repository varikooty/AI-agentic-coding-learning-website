"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AgentRunState, PublicAgentChallenge } from "@/lib/agent/types";
import TierBadge from "./TierBadge";
import PromptEditor from "./PromptEditor";
import ScoreDial from "./ScoreDial";
import FileBrowser from "./agent/FileBrowser";
import TranscriptView from "./agent/TranscriptView";
import DiffView from "./agent/DiffView";
import ScoreBreakdown from "./agent/ScoreBreakdown";
import { recordAttempt } from "@/lib/progress";

const TERMINAL_STATUSES = ["done", "ask_user", "ran-out-of-steps", "error"];
const POLL_INTERVAL_MS = 2000;

export default function AgenticTargetClient({ challenge }: { challenge: PublicAgentChallenge }) {
  const [instructions, setInstructions] = useState(challenge.startingInstructions);
  const [runState, setRunState] = useState<AgentRunState | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function launchRun() {
    if (launching) return;
    setLaunching(true);
    setLaunchError(null);
    recordedRef.current = false;
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, instructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start run.");

      setRunState({
        runId: data.runId,
        challengeId: challenge.id,
        status: "queued",
        currentStep: 0,
        maxSteps: challenge.maxSteps,
        steps: [],
      });

      pollRef.current = setInterval(async () => {
        const r = await fetch(`/api/agent/run/${data.runId}`);
        if (!r.ok) return;
        const state: AgentRunState = await r.json();
        setRunState(state);

        if (TERMINAL_STATUSES.includes(state.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (state.grading && !recordedRef.current) {
            recordedRef.current = true;
            recordAttempt(challenge.id, state.grading.score);
          }
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLaunching(false);
    }
  }

  const running = runState !== null && !TERMINAL_STATUSES.includes(runState.status);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="text-sm text-range-dim hover:text-range-brass2">
        ← Back to the range
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <TierBadge tier={challenge.tier} showDistance />
        <span className="text-xs font-mono uppercase tracking-wider text-range-dim/70">agent run</span>
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
              Starter repo
            </div>
            <FileBrowser files={challenge.files} />
          </section>

          <section className="space-y-3">
            <PromptEditor
              value={instructions}
              onChange={setInstructions}
              label="Instructions for the agent"
              placeholder="Tell the agent what to do…"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={launchRun}
                disabled={launching || running || !instructions.trim()}
                className="rounded-md bg-range-brass px-5 py-2 text-sm font-semibold text-range-bg transition hover:bg-range-brass2 disabled:opacity-40"
              >
                {launching || running ? "Running…" : "Launch agent"}
              </button>
              {launchError && <span className="text-sm text-range-red">{launchError}</span>}
            </div>
          </section>

          {runState && (
            <section>
              <TranscriptView steps={runState.steps} maxSteps={runState.maxSteps} status={runState.status} />
            </section>
          )}

          {runState?.fileDiffs && (
            <section>
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-range-dim/70">
                Changes
              </div>
              <DiffView diffs={runState.fileDiffs} />
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          {runState?.grading && <ScoreDial score={runState.grading.score} shot={runState.grading.shot} />}
          {runState?.grading && <ScoreBreakdown dimensions={runState.grading.dimensions} />}

          {runState?.status === "ask_user" && runState.askUserQuestion && (
            <div className="rounded-lg border border-range-amber/40 bg-range-amber/5 p-4">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-range-amber">
                The agent is asking
              </div>
              <p className="text-sm text-range-text/90 leading-relaxed">{runState.askUserQuestion}</p>
            </div>
          )}

          <div className="rounded-lg border border-range-line bg-range-panel p-4">
            <div className="mb-2 text-xs font-mono uppercase tracking-wider text-range-dim/70">
              About this run
            </div>
            <p className="text-xs text-range-dim leading-relaxed">
              {runState?.grading?.modelReliabilityNote ??
                "This agent runs on Groq (openai/gpt-oss-120b). If it ever explains a fix in plain text instead of actually making it, that's shown honestly in the transcript, not hidden."}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
