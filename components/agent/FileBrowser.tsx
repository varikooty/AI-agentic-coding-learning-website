"use client";

import { useState } from "react";
import { highlightPython, type TokenKind } from "@/lib/pythonHighlight";
import type { PublicRepoFile } from "@/lib/agent/types";

const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: "text-range-brass2",
  string: "text-range-green",
  comment: "text-range-dim/70",
  number: "text-range-amber",
  decorator: "text-range-amber",
  plain: "text-range-text",
};

export default function FileBrowser({ files }: { files: PublicRepoFile[] }) {
  const [activePath, setActivePath] = useState(files[0]?.path);
  const active = files.find((f) => f.path === activePath) ?? files[0];
  const lines = active ? highlightPython(active.content) : [];

  return (
    <div className="rounded-lg border border-range-line bg-range-panel">
      <div className="flex flex-wrap gap-1 border-b border-range-line p-2">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => setActivePath(f.path)}
            className={`rounded px-2 py-1 font-mono text-xs ${
              f.path === active?.path
                ? "bg-range-brass/20 text-range-brass2"
                : "text-range-dim hover:text-range-text"
            }`}
          >
            {f.path}
          </button>
        ))}
      </div>
      <pre className="scroll-thin overflow-x-auto whitespace-pre p-3 font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <div key={i}>
            {line.length === 0 ? (
              " "
            ) : (
              line.map((tok, j) => (
                <span key={j} className={TOKEN_CLASS[tok.kind]}>
                  {tok.text}
                </span>
              ))
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}
