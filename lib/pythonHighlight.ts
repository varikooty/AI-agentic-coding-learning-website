export type TokenKind = "keyword" | "string" | "comment" | "number" | "decorator" | "plain";

export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = new Set([
  "def", "class", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or",
  "import", "from", "as", "with", "try", "except", "finally", "raise", "pass", "break",
  "continue", "lambda", "yield", "None", "True", "False", "self", "is", "assert",
  "global", "nonlocal", "del", "async", "await",
]);

// Matches strings (incl. multi-line triple-quoted) and comments first, so keyword/number
// tokenizing never runs on text that's actually inside a string or comment.
const STRING_OR_COMMENT_RE =
  /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|#[^\n]*)/g;

const WORD_RE = /(\d+\.?\d*)|(@\w+)|(\w+)|(\s+)|([^\w\s])/g;

/**
 * Good enough for read-only display of a handful of small, trusted files —
 * not a general-purpose Python parser. Returns one token array per line.
 */
export function highlightPython(code: string): Token[][] {
  const flatTokens: Token[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(STRING_OR_COMMENT_RE)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) tokenizePlain(code.slice(lastIndex, idx), flatTokens);
    const kind: TokenKind = match[0].startsWith("#") ? "comment" : "string";
    flatTokens.push({ text: match[0], kind });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < code.length) tokenizePlain(code.slice(lastIndex), flatTokens);

  const lines: Token[][] = [[]];
  for (const tok of flatTokens) {
    const parts = tok.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part.length > 0) lines[lines.length - 1].push({ text: part, kind: tok.kind });
    });
  }

  return lines;
}

function tokenizePlain(text: string, out: Token[]): void {
  for (const m of text.matchAll(WORD_RE)) {
    const [full, num, decorator, word] = m;
    if (num) out.push({ text: full, kind: "number" });
    else if (decorator) out.push({ text: full, kind: "decorator" });
    else if (word) out.push({ text: full, kind: KEYWORDS.has(word) ? "keyword" : "plain" });
    else out.push({ text: full, kind: "plain" });
  }
}
