import type { ShotResult, Tier } from "../types";

export type ToolName = "list_files" | "read_file" | "write_file" | "run_tests" | "ask_user" | "done";

export interface RunTestsResult {
  passed: boolean;
  output: string;
  exitCode: number;
  timedOut: boolean;
}

export type TranscriptStepKind = "tool_call" | "tool_result" | "malformed" | "final";

export interface TranscriptStep {
  index: number;
  kind: TranscriptStepKind;
  toolName?: ToolName;
  args?: Record<string, unknown>;
  resultSummary?: string;
  rawModelText?: string;
  timestampMs: number;
}

export type AgentRunStatus = "done" | "ask_user" | "ran-out-of-steps" | "error";

export interface AgentRunResult {
  status: AgentRunStatus;
  finalSummary?: string;
  askUserQuestion?: string;
  errorMessage?: string;
  steps: TranscriptStep[];
}

export interface ChatToolCall {
  /** Present on responses from OpenAI-compatible APIs (e.g. Groq) — echoed back on the matching tool-result message. */
  id?: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ChatToolCall[];
  /** Required on role: "tool" messages by OpenAI-compatible APIs — must match the tool_calls[].id it's answering. */
  tool_call_id?: string;
}

export interface ChatTool {
  type: "function";
  function: {
    name: ToolName;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

// ---------------------------------------------------------------------------
// Challenge content (SERVER ONLY for AgentChallenge — see lib/agent-challenges/)
// ---------------------------------------------------------------------------

export interface AgentChallenge {
  id: string;
  tier: Tier;
  title: string;
  tagline: string;
  scenario: string;
  goal: string;
  startingInstructions: string;
  hints: string[];
  /** Hard-blocked at the write_file tool level regardless of task. */
  offLimitFiles: string[];
  /** Files the reference/expected fix touches — basis for the "scope" dimension. */
  expectedFiles: string[];
  /** Advanced-tier flag: correct behavior is ask_user(), not guessing. */
  expectsAskUser: boolean;
  /** Expert-tier: a file that looks dead/unused but is actually load-bearing. */
  trapFile?: string;
  /** The file that actually imports/depends on trapFile — exploring it (or asking) before touching trapFile avoids the safety penalty. */
  trapImporterFile?: string;
  maxSteps: number;
  repoDir: string;
}

export interface PublicRepoFile {
  path: string;
  content: string;
}

export interface PublicAgentChallenge {
  id: string;
  tier: Tier;
  title: string;
  tagline: string;
  scenario: string;
  goal: string;
  startingInstructions: string;
  hints: string[];
  maxSteps: number;
  files: PublicRepoFile[];
}

// ---------------------------------------------------------------------------
// Run state (API/UI layer)
// ---------------------------------------------------------------------------

export interface FileDiffEntry {
  path: string;
  status: "added" | "modified" | "unchanged";
  before: string;
  after: string;
}

export interface DimensionScore {
  score: number;
  label: string;
  note: string;
}

export interface AgentGradeResponse {
  score: number;
  shot: ShotResult;
  dimensions: {
    correctness: DimensionScore;
    scope: DimensionScore;
    verification: DimensionScore;
    safety: DimensionScore;
    communication: DimensionScore;
  };
  modelReliabilityNote?: string;
}

export type RunStatus = "queued" | "running" | "done" | "ask_user" | "ran-out-of-steps" | "error";

export interface AgentRunState {
  runId: string;
  challengeId: string;
  status: RunStatus;
  currentStep: number;
  maxSteps: number;
  steps: TranscriptStep[];
  finalSummary?: string;
  askUserQuestion?: string;
  errorMessage?: string;
  fileDiffs?: FileDiffEntry[];
  grading?: AgentGradeResponse;
}
