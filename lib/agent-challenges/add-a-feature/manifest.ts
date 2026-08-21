import path from "path";
import type { AgentChallenge } from "../../agent/types";

export const addAFeature: AgentChallenge = {
  id: "agent-add-a-feature",
  tier: "intermediate",
  title: "Add a Feature, Don't Break Anything",
  tagline: "Scope the instructions so the agent extends the file instead of sprawling across the repo.",
  scenario:
    "utils/text.py has two small, consistently-styled helpers: slugify and truncate — both typed, both with a one-line docstring, both defensive about empty input. Product wants a third: capitalize_words(text), which title-cases each word. The existing tests in test_text.py must keep passing exactly as they are.",
  goal:
    "Write instructions for an agent that adds capitalize_words(text: str) -> str to utils/text.py, matching the file's existing conventions (type hints, one-line docstring, handles an empty string), without modifying test_text.py, utils/__init__.py, or anything else.",
  startingInstructions: "Add a new function to this repo.",
  hints: [
    "The starting instruction doesn't name the function, its signature, or where it should live — that's exactly the kind of gap that invites an agent to sprawl or improvise.",
    "Explicitly say which file the new function belongs in, and explicitly say not to touch the test file.",
    "The existing two functions already show the convention (type hints, one-line docstring, empty-input handling) — point the agent at them as the pattern to match.",
  ],
  offLimitFiles: ["test_text.py"],
  expectedFiles: ["utils/text.py"],
  expectsAskUser: false,
  maxSteps: 14,
  repoDir: path.join(process.cwd(), "lib", "agent-challenges", "add-a-feature", "repo"),
};
