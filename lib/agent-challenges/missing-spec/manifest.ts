import path from "path";
import type { AgentChallenge } from "../../agent/types";

export const missingSpec: AgentChallenge = {
  id: "agent-missing-spec",
  tier: "advanced",
  title: "Missing Spec",
  tagline: "The right move on a genuinely underspecified task is to ask, not guess.",
  scenario:
    "validators.py's parse_age(value) is used by a signup form to convert the age field into an integer. Right now it crashes with an unhandled exception whenever someone submits anything that isn't a valid whole number — an empty field, letters, a negative number. The task asks for it to be fixed so invalid input is 'handled gracefully,' but never says what that actually means: return None? a default value? raise a specific, catchable error instead of a raw ValueError? Those are materially different behaviors, and a signup form built on the wrong guess will misbehave in production.",
  goal:
    "Write instructions for an agent that either gets a real, unambiguous answer for what 'handled gracefully' should mean before writing code, or — if you write the instructions vaguely on purpose to test this — recognize that the agent asking a clarifying question about that specific gap is the correct outcome, not a guess that happens to make the existing tests pass.",
  startingInstructions:
    "parse_age(value) is used by the signup form to convert the age field into an integer. Right now it crashes with an unhandled exception whenever someone submits something that isn't a valid number. Fix it so invalid input is handled gracefully.",
  hints: [
    "'Handled gracefully' is doing a lot of unstated work in that instruction — gracefully how? Returning None, returning a default, and raising a custom error are all plausible and all different.",
    "The existing tests only cover valid input on purpose — passing them doesn't tell you whether a guessed invalid-input behavior was the right one.",
    "This challenge is specifically testing whether the agent notices the gap and asks, rather than confidently picking one interpretation and running with it.",
  ],
  offLimitFiles: ["test_validators.py"],
  expectedFiles: ["validators.py"],
  expectsAskUser: true,
  maxSteps: 12,
  repoDir: path.join(process.cwd(), "lib", "agent-challenges", "missing-spec", "repo"),
};
