import fs from "fs";
import path from "path";

/**
 * Resolves relPath against sandboxDir and throws unless the result is
 * still inside the sandbox — the only barrier between an agent's file
 * tool calls and the rest of the filesystem, so every check here fails
 * closed (reject on any ambiguity) rather than open.
 */
export function resolveInSandbox(sandboxDir: string, relPath: string): string {
  if (typeof relPath !== "string" || relPath.length === 0) {
    throw new Error("path must be a non-empty string");
  }
  if (path.isAbsolute(relPath)) {
    throw new Error("path must be relative to the repo root, not absolute");
  }
  const segments = relPath.split(/[/\\]/);
  if (segments.includes("..")) {
    throw new Error("path must not contain '..' segments");
  }

  const sandboxRoot = fs.realpathSync(sandboxDir);
  const resolved = path.resolve(sandboxRoot, relPath);

  if (resolved !== sandboxRoot && !resolved.startsWith(sandboxRoot + path.sep)) {
    throw new Error("path escapes the sandbox");
  }

  return resolved;
}

export function isOffLimits(relPath: string, offLimits: string[]): boolean {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  return offLimits.some((entry) => entry.replace(/\\/g, "/") === normalized);
}
