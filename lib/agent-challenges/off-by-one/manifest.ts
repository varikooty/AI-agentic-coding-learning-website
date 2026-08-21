import path from "path";
import type { AgentChallenge } from "../../agent/types";

export const offByOne: AgentChallenge = {
  id: "agent-off-by-one",
  tier: "beginner",
  title: "Off By One",
  tagline: "A different bug class, same lesson: the agent only knows what you tell it.",
  scenario:
    "sums.py has a small helper, sum_first_n(numbers, n), that's supposed to add up the first n values in a list. It's one character off from correct, and the existing tests already catch it — every single one currently fails.",
  goal:
    "Write instructions for an agent that will find and fix the loop bug in sums.py, verify the fix with the existing tests, and stop — without touching anything else.",
  startingInstructions: "Fix the bug.",
  hints: [
    "All three existing tests fail the same way — read the failure output carefully, it tells you exactly how far off the sum is.",
    "Tell the agent explicitly to run the tests after making a change, and to only modify sums.py.",
    "This is a different bug class than a wrong operator — a loop boundary that's off by one still shows up the same way in the transcript: a plausible-looking fix that either overshoots or undershoots.",
  ],
  offLimitFiles: ["test_sums.py"],
  expectedFiles: ["sums.py"],
  expectsAskUser: false,
  maxSteps: 12,
  repoDir: path.join(process.cwd(), "lib", "agent-challenges", "off-by-one", "repo"),
};
