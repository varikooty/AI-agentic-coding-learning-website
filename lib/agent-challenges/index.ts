import fs from "fs";
import path from "path";
import { beginnerFixTheBug } from "./beginner-fix-the-bug/manifest";
import { offByOne } from "./off-by-one/manifest";
import { addAFeature } from "./add-a-feature/manifest";
import { refactorTrap } from "./refactor-trap/manifest";
import { missingSpec } from "./missing-spec/manifest";
import { loadBearingFile } from "./load-bearing-file/manifest";
import type { AgentChallenge, PublicAgentChallenge, PublicRepoFile } from "../agent/types";

/**
 * SERVER ONLY (indirectly): repoDir is a real filesystem path. Never import
 * from a "use client" component — go through toPublicAgentChallenge().
 */

export const agentChallenges: AgentChallenge[] = [
  beginnerFixTheBug,
  offByOne,
  addAFeature,
  refactorTrap,
  missingSpec,
  loadBearingFile,
];

export function getAgentChallenge(id: string): AgentChallenge | undefined {
  return agentChallenges.find((c) => c.id === id);
}

const SKIP_DIRS = new Set([".git", "__pycache__", ".pytest_cache", "node_modules"]);

function readRepoFiles(repoDir: string): PublicRepoFile[] {
  const files: PublicRepoFile[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
      } else {
        files.push({
          path: path.relative(repoDir, full).replace(/\\/g, "/"),
          content: fs.readFileSync(full, "utf-8"),
        });
      }
    }
  }

  walk(repoDir);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export function toPublicAgentChallenge(c: AgentChallenge): PublicAgentChallenge {
  return {
    id: c.id,
    tier: c.tier,
    title: c.title,
    tagline: c.tagline,
    scenario: c.scenario,
    goal: c.goal,
    startingInstructions: c.startingInstructions,
    hints: c.hints,
    maxSteps: c.maxSteps,
    files: readRepoFiles(c.repoDir),
  };
}
