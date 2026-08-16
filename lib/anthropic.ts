import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Lazily constructed so builds/typechecks don't require ANTHROPIC_API_KEY to be set. */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to your environment (see .env.example)."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

export async function runPrompt(opts: {
  system?: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user", content: opts.userMessage }],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
