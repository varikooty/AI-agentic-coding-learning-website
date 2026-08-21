import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAgentChallenge } from "@/lib/agent-challenges";
import { createSandbox } from "@/lib/agent/sandbox";
import { runAgentLoop } from "@/lib/agent/loop";
import { computeFileDiffs } from "@/lib/agent/diff";
import { gradeRun } from "@/lib/agent/grading";
import { createRun, appendStep, updateRun } from "@/lib/agent/runStore";
import type { AgentRunStatus, RunStatus } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function mapStatus(loopStatus: AgentRunStatus): RunStatus {
  return loopStatus;
}

async function executeRun(runId: string, challengeId: string, instructions: string): Promise<void> {
  const challenge = getAgentChallenge(challengeId);
  if (!challenge) {
    updateRun(runId, { status: "error", errorMessage: "Unknown challenge." });
    return;
  }

  const sandbox = await createSandbox(challenge.repoDir);
  try {
    updateRun(runId, { status: "running" });

    const runResult = await runAgentLoop({
      sandboxDir: sandbox.dir,
      instructions,
      maxSteps: challenge.maxSteps,
      offLimits: challenge.offLimitFiles,
      onStep: (step) => appendStep(runId, step),
    });

    const fileDiffs = await computeFileDiffs(challenge.repoDir, sandbox.dir).catch(() => []);
    const status = mapStatus(runResult.status);

    // Grading (including the judge call) must finish before status flips to
    // a terminal value — the frontend stops polling as soon as it sees a
    // terminal status, so a status update that lands before grading would
    // mean the score breakdown never arrives.
    const grading =
      runResult.status !== "error" ? await gradeRun(challenge, runResult, fileDiffs).catch(() => undefined) : undefined;

    updateRun(runId, {
      status,
      finalSummary: runResult.finalSummary,
      askUserQuestion: runResult.askUserQuestion,
      errorMessage: runResult.errorMessage,
      fileDiffs,
      grading,
    });
  } catch (err) {
    updateRun(runId, {
      status: "error",
      errorMessage: err instanceof Error ? err.message : "unknown error",
    });
  } finally {
    await sandbox.cleanup();
  }
}

export async function POST(req: NextRequest) {
  let body: { challengeId?: string; instructions?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { challengeId, instructions } = body;
  if (!challengeId || typeof challengeId !== "string") {
    return NextResponse.json({ error: "Missing challengeId." }, { status: 400 });
  }
  if (!instructions || typeof instructions !== "string" || !instructions.trim()) {
    return NextResponse.json({ error: "Missing instructions." }, { status: 400 });
  }

  const challenge = getAgentChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Unknown challenge." }, { status: 404 });
  }

  const runId = randomUUID();
  createRun({
    runId,
    challengeId,
    status: "queued",
    currentStep: 0,
    maxSteps: challenge.maxSteps,
    steps: [],
  });

  // Fire-and-forget: next dev's persistent Node process keeps this alive
  // after the response is sent. Local-dev only, not production-safe.
  void executeRun(runId, challengeId, instructions);

  return NextResponse.json({ runId, status: "queued" });
}
