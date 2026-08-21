"use client";

import { useState } from "react";
import type { RunStatus, TranscriptStep } from "@/lib/agent/types";

interface Turn {
  index: number;
  call?: TranscriptStep;
  result?: TranscriptStep;
  malformed?: TranscriptStep;
  final?: TranscriptStep;
}

function groupByIndex(steps: TranscriptStep[]): Turn[] {
  const byIndex = new Map<number, Turn>();
  for (const step of steps) {
    const turn = byIndex.get(step.index) ?? { index: step.index };
    if (step.kind === "tool_call") turn.call = step;
    else if (step.kind === "tool_result") turn.result = step;
    else if (step.kind === "malformed") turn.malformed = step;
    else if (step.kind === "final") turn.final = step;
    byIndex.set(step.index, turn);
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

const STATUS_LABEL: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  ask_user: "Asked a question",
  "ran-out-of-steps": "Ran out of steps",
  error: "Error",
};

const STATUS_CLASS: Record<RunStatus, string> = {
  queued: "text-range-dim",
  running: "text-range-brass2",
  done: "text-range-green",
  ask_user: "text-range-amber",
  "ran-out-of-steps": "text-range-amber",
  error: "text-range-red",
};

function TurnRow({ turn }: { turn: Turn }) {
  const [open, setOpen] = useState(false);

  if (turn.malformed) {
    return (
      <div className="border-l-2 border-range-amber bg-range-amber/5 px-3 py-2">
        <div className="font-mono text-xs text-range-amber">[{turn.index}] model did not call a tool</div>
        <p className="mt-1 whitespace-pre-wrap font-mono text-xs text-range-dim">
          {(turn.malformed.rawModelText ?? "").slice(0, 400)}
        </p>
      </div>
    );
  }

  if (turn.final) {
    const isAskUser = turn.final.toolName === "ask_user";
    return (
      <div
        className={
          isAskUser
            ? "border-l-2 border-range-amber bg-range-amber/5 px-3 py-2"
            : "border-l-2 border-range-green bg-range-green/5 px-3 py-2"
        }
      >
        <div className={`font-mono text-xs ${isAskUser ? "text-range-amber" : "text-range-green"}`}>
          [{turn.index}] {isAskUser ? "asked a question" : "done()"}
        </div>
        <p className="mt-1 whitespace-pre-wrap font-mono text-xs text-range-text">{turn.final.resultSummary}</p>
      </div>
    );
  }

  if (!turn.call) return null;

  return (
    <div className="px-3 py-2">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <div className="font-mono text-xs text-range-text">
          [{turn.index}] <span className="text-range-brass2">{turn.call.toolName}</span>
          <span className="text-range-dim">({JSON.stringify(turn.call.args ?? {})})</span>
        </div>
      </button>
      {open && turn.result && (
        <pre className="scroll-thin mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-range-bg p-2 font-mono text-xs text-range-dim">
          {turn.result.resultSummary}
        </pre>
      )}
    </div>
  );
}

export default function TranscriptView({
  steps,
  maxSteps,
  status,
}: {
  steps: TranscriptStep[];
  maxSteps: number;
  status: RunStatus;
}) {
  const turns = groupByIndex(steps);
  const currentStep = turns.length > 0 ? turns[turns.length - 1].index + 1 : 0;

  return (
    <div className="rounded-lg border border-range-line bg-range-panel">
      <div className="mb-1 flex items-center justify-between border-b border-range-line px-3 py-2">
        <span className="text-xs font-mono uppercase tracking-wider text-range-dim/70">Transcript</span>
        <span className="font-mono text-xs">
          <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
          <span className="ml-2 text-range-dim">
            {currentStep}/{maxSteps}
          </span>
        </span>
      </div>
      <div className="scroll-thin max-h-96 divide-y divide-range-line overflow-y-auto">
        {turns.length === 0 ? (
          <p className="px-3 py-4 text-xs text-range-dim">Waiting for the first step...</p>
        ) : (
          turns.map((turn) => <TurnRow key={turn.index} turn={turn} />)
        )}
      </div>
    </div>
  );
}
