import fs from "fs/promises";
import path from "path";
import { isOffLimits, resolveInSandbox } from "./pathGuard";
import { runTestsInSandbox } from "./pytestRunner";
import type { RunTestsResult } from "./types";

const SKIP_DIRS = new Set([".git", "__pycache__", ".pytest_cache", "node_modules"]);

export async function listFiles(sandboxDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(path.join(dir, entry.name));
      } else {
        results.push(path.relative(sandboxDir, path.join(dir, entry.name)));
      }
    }
  }

  await walk(sandboxDir);
  return results.sort();
}

export async function readFile(sandboxDir: string, relPath: string): Promise<string> {
  try {
    const resolved = resolveInSandbox(sandboxDir, relPath);
    return await fs.readFile(resolved, "utf-8");
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "could not read file"}`;
  }
}

export async function writeFile(
  sandboxDir: string,
  relPath: string,
  content: string,
  offLimits: string[] = []
): Promise<string> {
  try {
    if (isOffLimits(relPath, offLimits)) {
      return `Error: ${relPath} is off-limits and cannot be modified for this challenge`;
    }
    const resolved = resolveInSandbox(sandboxDir, relPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");
    return `Wrote ${relPath} (${content.length} bytes)`;
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "could not write file"}`;
  }
}

export async function runTests(sandboxDir: string): Promise<RunTestsResult> {
  return runTestsInSandbox(sandboxDir);
}
