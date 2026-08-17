/**
 * Talks to a local Ollama server instead of the Anthropic API — no key, no
 * billing, runs entirely on your machine. `runPrompt`'s signature is kept
 * identical to the previous Anthropic-backed version so grading.ts and the
 * API routes don't need to change.
 *
 * Requires Ollama running locally (https://ollama.com) with the model pulled:
 *   ollama pull llama3.1:8b
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

interface OllamaChatResponse {
  message?: { role: string; content: string };
}

export async function runPrompt(opts: {
  system?: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.userMessage });

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: { num_predict: opts.maxTokens ?? 1024 },
      }),
    });
  } catch {
    throw new Error(
      `Couldn't reach Ollama at ${OLLAMA_BASE_URL}. Is it running? Start it and make sure "${MODEL}" is pulled (ollama pull ${MODEL}).`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama request failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  const content = data.message?.content;
  if (typeof content !== "string") {
    throw new Error("Ollama response didn't include message content.");
  }
  return content.trim();
}
