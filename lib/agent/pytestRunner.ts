import { spawn } from "child_process";
import path from "path";
import type { RunTestsResult } from "./types";

const WRAPPER = path.join(process.cwd(), "lib", "agent", "pytest_runner.py");
const TIMEOUT_MS = 10_000;
const MAX_OUTPUT_CHARS = 4000;

/**
 * Runs pytest directly as a subprocess against the sandbox directory — no
 * Docker. Render's standard Web Service containers don't expose a Docker
 * daemon and don't support privileged/nested containers, so the previous
 * `docker run --network none --read-only ...` sandbox can't run there.
 *
 * This trades away process/network isolation for something that works
 * anywhere Python 3 + pytest are installed:
 *  - memory/CPU/process-count are capped via POSIX rlimits, set inside
 *    pytest_runner.py before pytest itself is imported
 *  - wall-clock time is capped here, and on expiry this kills the whole
 *    process GROUP (not just the direct child) — pytest can spawn its own
 *    children, and killing only the parent would leave those running
 *
 * What this does NOT do, unlike the Docker version: it doesn't block
 * network access (no network namespace without root) and it doesn't lock
 * the process to the sandbox directory (no chroot without root) — code a
 * write_file call places in the sandbox can still reach the network or,
 * within this container's own filesystem permissions, write outside
 * sandboxDir if it goes out of its way to. This runs LLM-authored code,
 * not adversarial attacker input, but it's a real reduction in contained
 * blast radius versus the Docker sandbox, accepted as the cost of
 * deploying somewhere that doesn't support nested containers.
 */
export function runTestsInSandbox(sandboxDir: string): Promise<RunTestsResult> {
  return new Promise((resolve) => {
    const child = spawn("python3", [WRAPPER, sandboxDir], { detached: true });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        // already exited
      }
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        passed: false,
        output: `Failed to start python3 (is it installed and on PATH?): ${err.message}`,
        exitCode: -1,
        timedOut: false,
      });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        passed: code === 0,
        output: truncate(stdout + stderr),
        exitCode: code ?? -1,
        timedOut: timedOut || signal === "SIGKILL",
      });
    });
  });
}

function truncate(text: string): string {
  return text.length > MAX_OUTPUT_CHARS ? text.slice(0, MAX_OUTPUT_CHARS) + "\n... (truncated)" : text;
}
