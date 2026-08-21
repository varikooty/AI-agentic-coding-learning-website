export const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const MAX_RETRIES = 8;
const MAX_BACKOFF_MS = 65_000;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment (see .env.example)."
    );
  }
  return apiKey;
}

/** Parses a protobuf-style duration ("57s", "570.5ms") out of a 429 error body. */
function parseRetryDelayMs(errorText: string): number | null {
  const retryInfoMatch = errorText.match(/"retryDelay"\s*:\s*"([\d.]+)(m?s)"/);
  if (retryInfoMatch) {
    const [, amount, unit] = retryInfoMatch;
    return unit === "ms" ? Number(amount) : Number(amount) * 1000;
  }
  const messageMatch = errorText.match(/retry in ([\d.]+)(m?s)/i);
  if (messageMatch) {
    const [, amount, unit] = messageMatch;
    return unit === "ms" ? Number(amount) : Number(amount) * 1000;
  }
  return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runPrompt(opts: {
  system?: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  // gemini-3.6-flash always spends some of its output budget on internal
  // "thinking" tokens before the visible answer (can't be disabled, only
  // turned down) — add headroom on top of the caller's requested length so
  // thinking doesn't eat into or truncate the actual response.
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.userMessage }] }],
    generationConfig: {
      maxOutputTokens: (opts.maxTokens ?? 1024) + 2048,
      thinkingConfig: { thinkingLevel: "low" },
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  let lastErrorText = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      const text: string =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";

      if (!text) {
        throw new Error("Unexpected Gemini response shape: no text in candidates.");
      }
      return text.trim();
    }

    lastErrorText = await response.text().catch(() => "");

    // 429 = free-tier rate limit (back off using the server's suggested
    // retryDelay); 503 = transient "model overloaded" — both worth retrying
    // instead of failing the whole grade run outright.
    if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
      const suggested = response.status === 429 ? parseRetryDelayMs(lastErrorText) : null;
      const waitMs = Math.min(suggested ?? 2 ** attempt * 1000, MAX_BACKOFF_MS) + Math.random() * 1000;
      await sleep(waitMs);
      continue;
    }

    throw new Error(`Gemini request failed (${response.status} ${response.statusText}): ${lastErrorText}`);
  }

  throw new Error(`Gemini request failed after ${MAX_RETRIES} retries: ${lastErrorText}`);
}
