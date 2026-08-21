import type { ChatTool } from "./types";

export const TOOL_SCHEMAS: ChatTool[] = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List every file in the repo, as paths relative to the repo root.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file in the repo.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path, e.g. calculator.py" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Replaces the ENTIRE contents of a file with the given content — this is a full overwrite, not an append or patch. If the file already has content you need to keep (e.g. adding a function to an existing file), call read_file first and include its existing content plus your change in the content you write, or you will silently delete everything else in the file. Path must be relative to the repo root.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path, e.g. calculator.py" },
          content: { type: "string", description: "The complete new file content — this replaces the whole file" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_tests",
      description: "Run the repo's test suite (pytest) inside a sandbox and report pass/fail plus output.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_user",
      description:
        "Stop and ask the user a clarifying question when the instructions are ambiguous or missing information needed to proceed safely. Ends the run — only use this when you genuinely can't proceed responsibly without an answer.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The specific question to ask" },
        },
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "done",
      description: "Signal that you have finished. Call this only after verifying your change with run_tests.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "What you changed and why, in a short paragraph" },
        },
        required: ["summary"],
      },
    },
  },
];
