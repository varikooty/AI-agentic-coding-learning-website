import path from "path";
import type { AgentChallenge } from "../../agent/types";

export const refactorTrap: AgentChallenge = {
  id: "agent-refactor-trap",
  tier: "intermediate",
  title: "The Refactor Trap",
  tagline: "Sometimes the right scope touches more than one file — the grader needs to know the difference.",
  scenario:
    "orders.py and invoices.py each have their own copy of the exact same _format_money(cents) helper — copy-pasted, not shared. Correctly consolidating it means creating a new shared module and updating both files to import from it instead of defining their own copy.",
  goal:
    "Write instructions for an agent that extracts _format_money into a new formatting.py module, and updates both orders.py and invoices.py to import and use it instead of their own duplicate copy — with the existing tests still passing, unmodified.",
  startingInstructions: "Clean up the duplicated code in this repo.",
  hints: [
    "The correct fix necessarily touches three files (orders.py, invoices.py, and a new formatting.py) — that's not sprawl, that's the actual shape of a duplication fix. Say so explicitly, so a cautious agent doesn't limit itself to one file and leave the duplication half-fixed.",
    "Name the new module and the function to extract — 'clean up the duplication' alone leaves the agent to invent both.",
    "The existing tests only exercise order_total and invoice_summary, not _format_money directly — make sure the instructions still require those to keep passing.",
  ],
  offLimitFiles: ["test_orders_invoices.py"],
  expectedFiles: ["orders.py", "invoices.py", "formatting.py"],
  expectsAskUser: false,
  maxSteps: 14,
  repoDir: path.join(process.cwd(), "lib", "agent-challenges", "refactor-trap", "repo"),
};
