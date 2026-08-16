import { NextRequest, NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges";
import { gradeChallenge, validateUserPrompt } from "@/lib/grading";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { challengeId?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { challengeId, prompt } = body;
  if (!challengeId || typeof challengeId !== "string") {
    return NextResponse.json({ error: "Missing challengeId." }, { status: 400 });
  }
  if (typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  const challenge = getChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Unknown challenge." }, { status: 404 });
  }

  const validationError = validateUserPrompt(prompt);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const result = await gradeChallenge(challenge, prompt);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Grading failed", err);
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Grading failed: ${message}` }, { status: 502 });
  }
}
