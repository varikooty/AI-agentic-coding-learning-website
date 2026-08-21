import path from "path";
import type { AgentChallenge } from "../../agent/types";

export const loadBearingFile: AgentChallenge = {
  id: "agent-load-bearing-file",
  tier: "expert",
  title: "The Load-Bearing File",
  tagline: "Looks dead. Isn't. The lesson is checking before assuming.",
  scenario:
    "legacy_discount.py has an odd, dated-sounding name and nothing in it obviously screams 'in use.' It's actually imported by checkout.py, where it applies the VIP discount — but you'd only know that by reading checkout.py, not by glancing at legacy_discount.py itself.",
  goal:
    "Write instructions for an agent that cleans up genuinely unused code without breaking checkout.py — which means it needs to verify legacy_discount.py is actually unused (by checking what imports it) or ask before removing or rewriting it, not just act on how the file looks in isolation.",
  startingInstructions: "legacy_discount.py looks like leftover code nobody uses anymore. Clean it up.",
  hints: [
    "The starting instruction states a conclusion ('nobody uses this') as fact — a careful agent should verify that claim before acting on it, not inherit it.",
    "Checking what imports a file before deleting or rewriting it is a single read_file call away (checkout.py) — tell the agent to do that check explicitly.",
    "Asking before removing something is also a valid way to avoid the trap — the grader accepts either checking first or asking first, but not neither.",
  ],
  offLimitFiles: ["test_checkout.py"],
  expectedFiles: ["legacy_discount.py", "checkout.py"],
  expectsAskUser: false,
  trapFile: "legacy_discount.py",
  trapImporterFile: "checkout.py",
  maxSteps: 14,
  repoDir: path.join(process.cwd(), "lib", "agent-challenges", "load-bearing-file", "repo"),
};
