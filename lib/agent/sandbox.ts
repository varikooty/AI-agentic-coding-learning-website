import fs from "fs/promises";
import os from "os";
import path from "path";

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
    cleanup: () => fs.rm(dir, { recursive: true, force: true }).catch(() => {}),
  };
}
