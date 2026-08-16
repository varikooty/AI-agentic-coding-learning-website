import { NextRequest, NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges";
import { runPrompt } from "@/lib/anthropic";
import type { GradeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 2000;

function buildCoachSystemPrompt(args: {
  scenario: string;
  goal: string;
  hints: string[];
  lastResult?: GradeResponse;
}): string {
  const { scenario, goal, hints, lastResult } = args;

  const failedTests = lastResult?.outcomes.filter((o) => !o.passed) ?? [];
  const resultSummary =
    lastResult && failedTests.length > 0
      ? `The learner's last submission scored ${lastResult.score}/100. These checks failed:\n${failedTests
          .map((f) => `- ${f.detail}`)
          .join("\n")}`
      : lastResult
        ? `The learner's last submission scored ${lastResult.score}/100 — everything passed.`
        : "The learner hasn't submitted a prompt to grade yet.";

  return `You are the coach in "The Range," a practice ground for prompt engineering. You are NOT the grader — you're a Socratic tutor sitting next to the learner while they work on one challenge.

Challenge scenario: ${scenario}
Challenge goal: ${goal}

Known pitfalls for this challenge (for your awareness only — do not read this list back to the learner):
${hints.map((h) => `- ${h}`).join("\n")}

${resultSummary}

Rules, in order of importance:
1. NEVER write a corrected or complete version of the learner's prompt, not even a fragment framed as "for example." If they ask you to just write it, tell them that's what the "give up, show me the fix" button is for, and instead ask them a question that points at the gap.
2. Answer by asking a guiding question or naming what's missing in general terms ("what happens if the input doesn't clearly lean one way?") — never by supplying the missing clause verbatim.
3. If they're stuck on why a specific test failed, you may explain WHY it failed in plain terms (referencing the failed-checks summary above), but still let them write the fix.
4. Keep responses short — 2-4 sentences. This is a nudge, not an essay.
5. Stay warm and encouraging. The goal is for them to have the "aha," not for you to have it for them.`;
}

export async function POST(req: NextRequest) {
  let body: {
    challengeId?: string;
    mode?: "hint" | "reveal";
    history?: CoachMessage[];
    lastResult?: GradeResponse;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { challengeId, mode = "hint", history = [], lastResult } = body;
  if (!challengeId || typeof challengeId !== "string") {
    return NextResponse.json({ error: "Missing challengeId." }, { status: 400 });
  }

  const challenge = getChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Unknown challenge." }, { status: 404 });
  }

  if (mode === "reveal") {
    return NextResponse.json({
      referencePrompt: challenge.referencePrompt,
      rationale: challenge.referenceRationale,
    });
  }

  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "Missing conversation history." }, { status: 400 });
  }
  if (history.length > MAX_HISTORY) {
    return NextResponse.json({ error: "Conversation too long for this session." }, { status: 400 });
  }
  for (const m of history) {
    if (
      typeof m.content !== "string" ||
      m.content.length > MAX_MESSAGE_LENGTH ||
      (m.role !== "user" && m.role !== "assistant")
    ) {
      return NextResponse.json({ error: "Malformed message in history." }, { status: 400 });
    }
  }

  const systemPrompt = buildCoachSystemPrompt({
    scenario: challenge.scenario,
    goal: challenge.goal,
    hints: challenge.hints,
    lastResult,
  });

  // Fold the short chat history into a single user turn — the grading/coach
  // endpoints are stateless, so we don't hold multi-turn Anthropic sessions server-side.
  const transcript = history
    .map((m) => `${m.role === "user" ? "Learner" : "Coach"}: ${m.content}`)
    .join("\n\n");

  try {
    const reply = await runPrompt({
      system: systemPrompt,
      userMessage: `Conversation so far:\n\n${transcript}\n\nWrite the coach's next reply.`,
      maxTokens: 300,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Coach call failed", err);
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Coach failed: ${message}` }, { status: 502 });
  }
}
