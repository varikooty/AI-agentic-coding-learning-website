import { getAgentChallenge } from "../lib/agent-challenges";
import { createSandbox } from "../lib/agent/sandbox";
import { runAgentLoop } from "../lib/agent/loop";
import { computeFileDiffs } from "../lib/agent/diff";
import type { TranscriptStep } from "../lib/agent/types";

const DEFAULT_CHALLENGE_ID = "agent-fix-the-bug";

function printStep(step: TranscriptStep) {
  const prefix = `[${step.index}] ${step.kind}`;
  switch (step.kind) {
    case "tool_call":
      console.log(`${prefix} ${step.toolName}(${JSON.stringify(step.args ?? {})})`);
      break;
    case "tool_result":
      console.log(`${prefix} ${step.toolName} ->\n    ${(step.resultSummary ?? "").replace(/\n/g, "\n    ")}`);
      break;
    case "malformed":
      console.log(`${prefix} model did not call a tool:\n    ${(step.rawModelText ?? "").slice(0, 500)}`);
      break;
    case "final":
      console.log(`${prefix} ${step.toolName === "ask_user" ? "ask_user()" : "done()"} -> ${step.resultSummary}`);
      break;
  }
}

async function main() {
  const challengeId = process.argv[2] || DEFAULT_CHALLENGE_ID;
  const challenge = getAgentChallenge(challengeId);
  if (!challenge) {
    console.error(`Unknown challenge id: ${challengeId}`);
    process.exit(1);
  }

  const instructions = process.argv[3] || challenge.startingInstructions;
  console.log(`Challenge: ${challenge.id}\nInstructions: ${instructions}\n`);

  const sandbox = await createSandbox(challenge.repoDir);
  console.log(`Sandbox: ${sandbox.dir}\n`);

  try {
    const result = await runAgentLoop({
      sandboxDir: sandbox.dir,
      instructions,
      maxSteps: challenge.maxSteps,
      offLimits: challenge.offLimitFiles,
      onStep: printStep,
    });

    console.log(`\n--- Result ---`);
    console.log(`Status: ${result.status}`);
    if (result.finalSummary) console.log(`Summary: ${result.finalSummary}`);
    if (result.askUserQuestion) console.log(`Question: ${result.askUserQuestion}`);
    if (result.errorMessage) console.log(`Error: ${result.errorMessage}`);
    const turnsUsed = result.steps.length > 0 ? Math.max(...result.steps.map((s) => s.index)) + 1 : 0;
    console.log(`Agent turns used: ${turnsUsed} (transcript entries: ${result.steps.length})`);

    const diffs = await computeFileDiffs(challenge.repoDir, sandbox.dir);
    const changed = diffs.filter((d) => d.status !== "unchanged");
    console.log(`\n--- Files changed: ${changed.length ? changed.map((d) => d.path).join(", ") : "(none)"} ---`);
    for (const d of changed) {
      console.log(`\n--- ${d.path} (${d.status}) before ---\n${d.before}`);
      console.log(`\n--- ${d.path} (${d.status}) after ---\n${d.after}`);
    }
  } finally {
    await sandbox.cleanup();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
