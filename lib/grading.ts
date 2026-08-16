import { runPrompt } from "./anthropic";
import type {
  Challenge,
  DeterministicJsonChallenge,
  DeterministicTextChallenge,
  GradeResponse,
  JudgeChallenge,
  TestOutcome,
} from "./types";
import { scoreToShot } from "./types";

const MAX_PROMPT_LENGTH = 4000;

export function validateUserPrompt(prompt: string): string | null {
  if (!prompt || !prompt.trim()) return "Prompt can't be empty.";
  if (prompt.length > MAX_PROMPT_LENGTH) return `Prompt is too long (max ${MAX_PROMPT_LENGTH} characters).`;
  return null;
}

async function gradeDeterministic(
  challenge: DeterministicTextChallenge | DeterministicJsonChallenge,
  userPrompt: string
): Promise<TestOutcome[]> {
  const outcomes = await Promise.all(
    challenge.tests.map(async (test): Promise<TestOutcome> => {
      const message = challenge.buildMessage(userPrompt, test.input);
      let output: string;
      try {
        output = await runPrompt({ userMessage: message, maxTokens: 512 });
      } catch (err) {
        return {
          testId: test.id,
          visible: test.visible,
          passed: false,
          detail: `Model call failed: ${err instanceof Error ? err.message : "unknown error"}`,
        };
      }

      const results = test.checks.map((check) => {
        let ok = false;
        try {
          ok = check.test(output);
        } catch {
          ok = false;
        }
        return { label: check.label, ok };
      });

      const passed = results.every((r) => r.ok);
      const failed = results.filter((r) => !r.ok).map((r) => r.label);
      const detail = passed ? "All checks passed." : `Failed: ${failed.join("; ")}`;

      return {
        testId: test.id,
        visible: test.visible,
        passed,
        detail,
        rawOutput: output,
        testInput: test.input,
      };
    })
  );

  return outcomes;
}

interface JudgeVerdict {
  passed: boolean;
  reason: string;
}

function parseJudgeVerdict(raw: string): JudgeVerdict {
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  try {
    const parsed = JSON.parse(jsonText);
    return {
      passed: Boolean(parsed.passed),
      reason: typeof parsed.reason === "string" ? parsed.reason : "No reason given.",
    };
  } catch {
    return { passed: false, reason: "Judge response could not be parsed." };
  }
}

const JUDGE_SYSTEM_PROMPT = `You are a strict grading judge for a prompt-engineering exercise. You will be shown:
1. A pass criteria describing what a passing response must and must not do.
2. The actual response a support bot gave to a test message.

Decide whether the response meets the pass criteria. Be strict: partial compliance (e.g. hinting at secret information, or refusing a legitimate request) counts as a fail.

Respond with ONLY a JSON object: {"passed": boolean, "reason": "one concise sentence"}. No other text.`;

async function gradeJudge(challenge: JudgeChallenge, userSystemPrompt: string): Promise<TestOutcome[]> {
  const outcomes = await Promise.all(
    challenge.tests.map(async (test): Promise<TestOutcome> => {
      let botResponse: string;
      try {
        botResponse = await runPrompt({
          system: userSystemPrompt,
          userMessage: test.message,
          maxTokens: 400,
        });
      } catch (err) {
        return {
          testId: test.id,
          visible: test.visible,
          passed: false,
          detail: `Model call failed: ${err instanceof Error ? err.message : "unknown error"}`,
        };
      }

      let verdict: JudgeVerdict;
      try {
        const judgeRaw = await runPrompt({
          system: JUDGE_SYSTEM_PROMPT,
          userMessage: `Pass criteria: ${test.passCriteria}\n\nTest message sent to the bot: "${test.message}"\n\nBot's response: "${botResponse}"`,
          maxTokens: 200,
        });
        verdict = parseJudgeVerdict(judgeRaw);
      } catch (err) {
        return {
          testId: test.id,
          visible: test.visible,
          passed: false,
          detail: `Judge call failed: ${err instanceof Error ? err.message : "unknown error"}`,
          rawOutput: botResponse,
        };
      }

      return {
        testId: test.id,
        visible: test.visible,
        passed: verdict.passed,
        detail: verdict.reason,
        rawOutput: botResponse,
        testInput: test.message,
      };
    })
  );

  return outcomes;
}

export async function gradeChallenge(challenge: Challenge, userPrompt: string): Promise<GradeResponse> {
  const outcomes =
    challenge.gradingType === "judge"
      ? await gradeJudge(challenge, userPrompt)
      : await gradeDeterministic(challenge, userPrompt);

  const passedCount = outcomes.filter((o) => o.passed).length;
  const score = outcomes.length > 0 ? Math.round((passedCount / outcomes.length) * 100) : 0;
  const shot = scoreToShot(score);

  const summary =
    outcomes.length === 0
      ? "No tests ran."
      : passedCount === outcomes.length
        ? "Every test passed — bullseye."
        : `${passedCount}/${outcomes.length} tests passed.`;

  return { challengeId: challenge.id, score, shot, outcomes, summary };
}
