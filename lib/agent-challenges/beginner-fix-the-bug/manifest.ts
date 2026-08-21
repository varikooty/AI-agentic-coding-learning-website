import path from "path";
import type { AgentChallenge } from "../../agent/types";

export const beginnerFixTheBug: AgentChallenge = {
  id: "agent-fix-the-bug",
  tier: "beginner",
  title: "Fix the Bug (Agent)",
  tagline: "Give the agent enough context that it fixes the real bug, not a guess.",
  scenario:
    "calculator.py has a small utility library backing a reporting script. One of its four functions has a one-character bug, and the existing test suite already catches it — nobody's run it in a while.",
  goal:
    "Write instructions for an agent that will explore this repo, find and fix the bug, verify the fix by running the tests, and stop — without touching anything else.",
  startingInstructions: "Fix the bug.",
  hints: [
    "The agent only sees what you tell it — a bare 'fix the bug' leaves it to guess which function, and whether to verify before declaring victory.",
    "Tell it explicitly to run the tests after making a change, and to only modify calculator.py.",
    "Watch the transcript: if the agent explains a fix in plain text instead of calling write_file, that's a real failure mode worth instructing around, not a bug in this platform.",
  ],
  offLimitFiles: [],
  expectedFiles: ["calculator.py"],
  expectsAskUser: false,
  maxSteps: 12,
  repoDir: path.join(process.cwd(), "lib", "agent-challenges", "beginner-fix-the-bug", "repo"),
};
