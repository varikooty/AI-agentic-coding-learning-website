import type { AgentRunState, TranscriptStep } from "./types";

/**
 * In-memory only, cached on globalThis so it survives Next.js dev-mode HMR
 * of other files. Does NOT survive a full `next dev` restart — acceptable
 * for a local-dev tool, same tradeoff lib/progress.ts already makes by
 * being localStorage-only.
 */
const g = globalThis as unknown as { __theRangeAgentRuns?: Map<string, AgentRunState> };
const runs = g.__theRangeAgentRuns ?? new Map<string, AgentRunState>();
g.__theRangeAgentRuns = runs;

export function createRun(state: AgentRunState): void {
  runs.set(state.runId, state);
}

export function getRun(runId: string): AgentRunState | undefined {
  return runs.get(runId);
}

export function updateRun(runId: string, patch: Partial<AgentRunState>): void {
  const existing = runs.get(runId);
  if (!existing) return;
  runs.set(runId, { ...existing, ...patch });
}

export function appendStep(runId: string, step: TranscriptStep): void {
  const existing = runs.get(runId);
  if (!existing) return;
  runs.set(runId, {
    ...existing,
    steps: [...existing.steps, step],
    currentStep: step.index + 1,
  });
}
