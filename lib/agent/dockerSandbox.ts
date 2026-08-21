import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from "util";
import type { RunTestsResult } from "./types";

const execFileAsync = promisify(execFile);

const IMAGE = "the-range-sandbox:latest";
const HOST_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_CHARS = 4000;

/**
 * Runs pytest inside a locked-down, network-isolated container against the
 * sandbox directory. The container's own `timeout` is the primary time
 * limit (self-terminates regardless of the host); the host-side timeout
 * below is a backstop, not the main mechanism, and explicitly kills/removes
 * the container by name rather than trusting --rm alone.
 */
export async function runTestsInSandbox(sandboxDir: string): Promise<RunTestsResult> {
  const runId = randomUUID();
  const containerName = `the-range-run-${runId}`;

  const args = [
    "run",
    "--rm",
    "--name",
    containerName,
    "--network",
    "none",
    "--memory=256m",
    "--memory-swap=256m",
    "--cpus=0.5",
    "--pids-limit=128",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,size=16m",
    "-v",
    `${sandboxDir}:/repo:rw`,
    "-w",
    "/repo",
    IMAGE,
    "timeout",
    "-k",
    "2",
    "10",
    "python",
    "-m",
    "pytest",
    "-q",
  ];

  try {
    const { stdout, stderr } = await execFileAsync("docker", args, { timeout: HOST_TIMEOUT_MS });
    return {
      passed: true,
      output: truncate(stdout + stderr),
      exitCode: 0,
      timedOut: false,
    };
  } catch (err) {
    const e = err as { code?: number; killed?: boolean; stdout?: string; stderr?: string };

    // Host-side backstop: the process was killed by our timeout rather than
    // exiting on its own — the container may still be running, so force it.
    if (e.killed) {
      await forceCleanupContainer(containerName);
    }

    const exitCode = typeof e.code === "number" ? e.code : -1;
    return {
      passed: exitCode === 0,
      output: truncate((e.stdout ?? "") + (e.stderr ?? "")),
      exitCode,
      timedOut: exitCode === 124 || Boolean(e.killed),
    };
  }
}

async function forceCleanupContainer(containerName: string): Promise<void> {
  try {
    await execFileAsync("docker", ["kill", containerName]);
  } catch {
    // already stopped/removed — fine
  }
  try {
    await execFileAsync("docker", ["rm", "-f", containerName]);
  } catch {
    // already removed — fine
  }
}

function truncate(text: string): string {
  return text.length > MAX_OUTPUT_CHARS ? text.slice(0, MAX_OUTPUT_CHARS) + "\n... (truncated)" : text;
}
