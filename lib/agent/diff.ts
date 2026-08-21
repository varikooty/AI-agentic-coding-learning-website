import fs from "fs/promises";
import path from "path";
import { listFiles } from "./tools";
import type { FileDiffEntry } from "./types";

/** Called before sandbox cleanup — compares the original repo to the final sandbox state. */
export async function computeFileDiffs(originalRepoDir: string, sandboxDir: string): Promise<FileDiffEntry[]> {
  const [beforePaths, afterPaths] = await Promise.all([listFiles(originalRepoDir), listFiles(sandboxDir)]);
  const allPaths = Array.from(new Set([...beforePaths, ...afterPaths])).sort();

  const diffs: FileDiffEntry[] = [];
  for (const relPath of allPaths) {
    const before = await readIfExists(path.join(originalRepoDir, relPath));
    const after = await readIfExists(path.join(sandboxDir, relPath));

    let status: FileDiffEntry["status"];
    if (before === null) status = "added";
    else if (before !== after) status = "modified";
    else status = "unchanged";

    diffs.push({ path: relPath, status, before: before ?? "", after: after ?? "" });
  }

  return diffs;
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}
