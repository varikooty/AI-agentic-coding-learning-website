import type { ChatMessage, ChatTool, ChatToolCall } from "./types";

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.AGENT_GROQ_MODEL || "openai/gpt-oss-120b";

export const AGENT_MODEL_LABEL = `${MODEL} (Groq)`;

/**
 * Separate, minimal client from lib/anthropic.ts (which talks to Gemini for
 * the prompt-grading challenges). No retry/backoff here on purpose: a
 * malformed or missing tool call from the model is real signal for the agent
 * loop to record, not a transport error to paper over. A genuine connection
 * failure to Groq itself still throws.
 */
function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to your environment (see .env.example).");
  }
  return apiKey;
}

interface GroqRawToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface GroqRawMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: GroqRawToolCall[];
}

/** Groq (like the rest of the OpenAI chat-completions family) sends tool_calls[].function.arguments as a JSON *string*, not an object — parse it into the shape the rest of the agent loop expects. */
function normalizeAssistantMessage(raw: GroqRawMessage): ChatMessage {
  const tool_calls: ChatToolCall[] | undefined = raw.tool_calls?.map((tc) => {
    let args: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(tc.function.arguments);
      if (parsed && typeof parsed === "object") args = parsed;
    } catch {
      // Leave args empty — downstream arg-shape checks in loop.ts will treat
      // the call as missing its required arguments, which is real signal.
    }
    return { id: tc.id, function: { name: tc.function.name, arguments: args } };
  });
  return { role: "assistant", content: raw.content ?? "", tool_calls };
}

/** ChatMessage keeps tool_calls[].function.arguments as a parsed object for loop.ts's convenience — Groq's wire format requires it back as a JSON string when the message round-trips into a later request. */
function toWireMessage(m: ChatMessage) {
  if (!m.tool_calls) return m;
  return {
    ...m,
    tool_calls: m.tool_calls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.function.name, arguments: JSON.stringify(tc.function.arguments ?? {}) },
    })),
  };
}

async function postChatCompletion(messages: ChatMessage[], tools?: ChatTool[]): Promise<GroqRawMessage> {
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages.map(toWireMessage),
      ...(tools ? { tools } : {}),
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    // gpt-oss's "harmony" response format occasionally leaks a hallucinated
    // tool name (a built-in-tool artifact like "repo_browser.search" or a
    // "commentary" wrapper), or free-form text Groq's strict parser can't
    // turn into a tool call at all ("output_parse_failed"). Unlike Ollama,
    // Groq rejects both at the API layer with a 400 instead of returning
    // them in a normal 200 — but it's the same "model didn't call a real
    // tool" case loop.ts already records as a malformed step and recovers
    // from, not a genuine transport failure. Surface it that way instead of
    // throwing, so one bad turn doesn't fail the whole run.
    if (response.status === 400) {
      let parsedError: { error?: { code?: string; message?: string; failed_generation?: string } } | undefined;
      try {
        parsedError = JSON.parse(text);
      } catch {
        // fall through to throw below
      }
      const code = parsedError?.error?.code;
      if (code === "tool_use_failed" || code === "output_parse_failed") {
        const detail = parsedError?.error?.failed_generation || parsedError?.error?.message;
        return { role: "assistant", content: `(invalid tool call attempted: ${detail})` };
      }
    }
    throw new Error(`Groq request failed (${response.status} ${response.statusText}): ${text}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  if (!message) {
    throw new Error("Unexpected Groq response shape: no choices[0].message field.");
  }
  return message as GroqRawMessage;
}

export async function callGroqWithTools(messages: ChatMessage[], tools: ChatTool[]): Promise<ChatMessage> {
  const message = await postChatCompletion(messages, tools);
  return normalizeAssistantMessage(message);
}

/** Plain chat call, no tools — used by the judge layer. */
export async function callGroq(messages: ChatMessage[]): Promise<string> {
  const message = await postChatCompletion(messages);
  if (typeof message.content !== "string") {
    throw new Error("Unexpected Groq response shape: no message.content field.");
  }
  return message.content;
}
