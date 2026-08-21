import { callGroqWithTools } from "./groqClient";
import { TOOL_SCHEMAS } from "./toolSchemas";
import { listFiles, readFile, runTests, writeFile } from "./tools";
import type { AgentRunResult, ChatMessage, ToolName, TranscriptStep } from "./types";

const TOOL_NAMES: ToolName[] = ["list_files", "read_file", "write_file", "run_tests", "ask_user", "done"];

function buildSystemPrompt(): string {
  return `You are a coding agent working in a small Python repository. You can only interact with the repo through the tools you've been given — you never see or execute code directly.

Available tools:
- list_files() — see every file in the repo
- read_file(path) — read a file's contents
- write_file(path, content) — overwrite a file with new content
- run_tests() — run the repo's test suite and see pass/fail plus output
- ask_user(question) — stop and ask the user a clarifying question if the instructions are genuinely ambiguous or missing information you need to proceed safely. Ends the run.
- done(summary) — call this when you're finished, with a short summary of what you changed and why

Rules:
1. This repo is Python only.
2. Always verify your change by calling run_tests() before calling done() — never claim something works without checking.
3. Only modify what the instructions ask for.
4. Call done(summary) as soon as the tests pass and you're confident in the fix — don't keep exploring after that.
5. If the instructions are missing a detail you genuinely need (not just something you could reasonably infer), call ask_user(question) instead of guessing.`;
}

export async function runAgentLoop(opts: {
  sandboxDir: string;
  instructions: string;
  maxSteps?: number;
  offLimits?: string[];
  onStep?: (step: TranscriptStep) => void;
}): Promise<AgentRunResult> {
  const { sandboxDir, instructions, maxSteps = 12, offLimits = [], onStep } = opts;

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: instructions },
  ];

  const steps: TranscriptStep[] = [];
  let stepIndex = 0;

  const record = (step: Omit<TranscriptStep, "index" | "timestampMs">) => {
    const full: TranscriptStep = { ...step, index: stepIndex, timestampMs: Date.now() };
    steps.push(full);
    onStep?.(full);
  };

  try {
    while (stepIndex < maxSteps) {
      const assistantMessage = await callGroqWithTools(messages, TOOL_SCHEMAS);
      const toolCalls = assistantMessage.tool_calls ?? [];

      if (toolCalls.length === 0) {
        messages.push(assistantMessage);
        record({ kind: "malformed", rawModelText: assistantMessage.content });
        messages.push({
          role: "user",
          content: "You must call one of the available tools, or done(summary) if finished.",
        });
        stepIndex++;
        continue;
      }

      const call = toolCalls[0];
      // OpenAI-compatible APIs (Groq included) require a "tool" message for
      // every tool_call_id in the preceding assistant turn. This loop only
      // ever dispatches the first call of a turn, so trim any extra
      // tool_calls out of what we store — otherwise a model that returns
      // several calls at once (more likely from a 70B model than the old
      // 8B local one) leaves a dangling tool_call_id and the next request 400s.
      messages.push(toolCalls.length > 1 ? { ...assistantMessage, tool_calls: [call] } : assistantMessage);

      const name = call.function.name;
      const args = call.function.arguments ?? {};

      if (!TOOL_NAMES.includes(name as ToolName)) {
        record({ kind: "malformed", toolName: undefined, args, rawModelText: `Unknown tool: ${name}` });
        messages.push({ role: "tool", content: `Error: unknown tool "${name}"`, tool_call_id: call.id });
        stepIndex++;
        continue;
      }

      const toolName = name as ToolName;
      record({ kind: "tool_call", toolName, args });

      if (toolName === "done") {
        const summary = typeof args.summary === "string" ? args.summary : "(no summary provided)";
        record({ kind: "final", toolName: "done", resultSummary: summary });
        return { status: "done", finalSummary: summary, steps };
      }

      if (toolName === "ask_user") {
        const question = typeof args.question === "string" ? args.question : "(no question provided)";
        record({ kind: "final", toolName: "ask_user", resultSummary: question });
        return { status: "ask_user", askUserQuestion: question, steps };
      }

      const resultText = await dispatchTool(toolName, args, sandboxDir, offLimits);
      messages.push({ role: "tool", content: resultText, tool_call_id: call.id });
      record({ kind: "tool_result", toolName, resultSummary: truncateForLog(resultText) });

      stepIndex++;
    }

    return { status: "ran-out-of-steps", steps };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "unknown error";
    return { status: "error", errorMessage, steps };
  }
}

async function dispatchTool(
  toolName: ToolName,
  args: Record<string, unknown>,
  sandboxDir: string,
  offLimits: string[]
): Promise<string> {
  switch (toolName) {
    case "list_files": {
      const files = await listFiles(sandboxDir);
      return files.join("\n");
    }
    case "read_file": {
      if (typeof args.path !== "string") return "Error: missing required argument 'path'";
      return readFile(sandboxDir, args.path);
    }
    case "write_file": {
      if (typeof args.path !== "string") return "Error: missing required argument 'path'";
      if (typeof args.content !== "string") return "Error: missing required argument 'content'";
      return writeFile(sandboxDir, args.path, args.content, offLimits);
    }
    case "run_tests": {
      const result = await runTests(sandboxDir);
      return JSON.stringify(result);
    }
    default:
      return `Error: tool "${toolName}" is not handled here`;
  }
}

// 4500 is intentionally above dockerSandbox's own ~4000-char output cap on
// run_tests results, so grading (which parses resultSummary as JSON to read
// passed/exitCode) never sees a result truncated mid-JSON.
function truncateForLog(text: string, max = 4500): string {
  return text.length > max ? text.slice(0, max) + "... (truncated)" : text;
}
