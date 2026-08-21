import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const IMAGE = "the-range-sandbox:latest";

export interface Sandbox {
  dir: string;
  cleanup: () => Promise<void>;
}

/** Copies sourceRepoDir into a fresh temp directory. The original is never touched. */
export async function createSandbox(sourceRepoDir: string): Promise<Sandbox> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "the-range-agent-"));
  await fs.cp(sourceRepoDir, dir, { recursive: true });

  return {
    dir,
    cleanup: () => cleanupSandbox(dir),
  };
}

/**
 * pytest runs inside the sandbox container as root, which leaves root-owned
 * artifacts (.pytest_cache, __pycache__) that the host user has no write
 * permission on — a plain fs.rm from Node throws EACCES on those. Clear the
 * directory contents via a container (which, as root, can delete its own
 * root-owned files) before removing the now-empty directory as the host user.
 * Best-effort on both steps: cleanup must never throw and block a run from
 * finishing, even if Docker itself is unavailable.
 */
async function clearAsRoot(dir: string): Promise<boolean> {
  try {
    await execFileAsync(
      "docker",
      ["run", "--rm", "--network", "none", "-v", `${dir}:/repo:rw`, IMAGE, "find", "/repo", "-mindepth", "1", "-delete"],
      { timeout: 15_000 }
    );
    return true;
  } catch {
    return false;
  }
}

async function cleanupSandbox(dir: string): Promise<void> {
  // One retry: under concurrent load the docker call can fail transiently
  // (observed in practice), and a failure here means fs.rm below will hit
  // the same root-owned-file permission wall and silently leave an orphan.
  if (!(await clearAsRoot(dir))) {
    await clearAsRoot(dir);
  }
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}
