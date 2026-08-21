# The Range

A LeetCode-style practice ground for prompt engineering. Each "target" is a
scenario with a goal and a hidden rubric — you write a prompt, fire it at
Claude, and get scored on a shooting-range dial (bullseye / inner ring /
outer ring / off the paper) instead of a plain progress bar.

## How it works

- **Tiers** (`beginner` → `expert`) group challenges by the skill they drill:
  clarity and specificity, format control, system-prompt hardening, and
  eventually tool/agent design.
- **Grading** is either deterministic (regex/JSON-schema/keyword checks — cheap,
  fast, consistent) or judged (a second Claude call scores the response
  against a written rubric — used for fuzzier things like injection
  resistance). See `lib/grading.ts`.
- **Hidden tests.** Every challenge shows one test case up front and holds
  back one or more until you fire, so a prompt that only works on the visible
  example won't score well.
- **Coach.** A chat panel (`components/CoachPanel.tsx`, `app/api/coach/route.ts`)
  answers questions in Socratic mode — it's told never to write a corrected
  prompt, even a fragment, and to ask guiding questions instead. A separate
  "give up, show me the fix" reveal returns the actual reference prompt and
  a rationale, so skipping ahead is always an explicit choice, not something
  you can talk the coach into.
- **Progress** (best score per challenge) is stored in `localStorage` only —
  there's no account system or backend database yet. See "Not built yet"
  below for what a v2 would add.

## Why there's a backend at all

Two separate LLM calls, each server-side only so the key never reaches the
browser:

- **Prompting track** — grading and the coach panel hit the Gemini API
  (`lib/anthropic.ts`, name kept for a small diff — it no longer touches
  Anthropic), called exclusively from `app/api/{grade,coach}/route.ts`.
  Needs `GEMINI_API_KEY`.
- **Agentic track** — the coding agent and its judge (`lib/agent/*`) hit
  Groq's OpenAI-compatible API (`lib/agent/groqClient.ts`), called from
  `app/api/agent/*/route.ts`. Needs `GROQ_API_KEY`. The agent's `run_tests`
  tool executes pytest inside a locked-down Docker container
  (`docker/sandbox.Dockerfile`, built as `the-range-sandbox:latest`) — Docker
  must be available wherever this runs.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY and GROQ_API_KEY
docker build -t the-range-sandbox:latest docker/  # needed for the agentic track
npm run dev
```

Open http://localhost:3000.

## Deploying

The prompting track is a standard Next.js app (frontend + serverless API
routes), so a plain deploy works:

1. **Vercel** — import this repo at https://vercel.com/new. Vercel detects
   Next.js automatically; no build config needed.
2. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) and `GROQ_API_KEY`
   (and optionally `AGENT_GROQ_MODEL` / `GROQ_BASE_URL`) in the project's
   Settings → Environment Variables.
3. Deploy. `/api/grade` and `/api/coach` run as serverless functions
   automatically.

Netlify or Cloudflare Pages work the same way for the prompting track. The
**agentic track's `run_tests` tool won't work on a plain serverless
deploy** — it shells out to `docker`, which serverless functions don't have.
Running the agentic track anywhere but locally means self-hosting (a VPS,
Docker Compose, etc.) on a machine that has Docker and can build/run the
`the-range-sandbox` image.

## Not built yet (natural next steps)

- **Accounts + a real database.** Right now progress lives in the browser's
  `localStorage`, so it doesn't follow you across devices and there's no
  leaderboard. Supabase or Neon (both Postgres) are the natural pairing —
  auth plus a `submissions` table keyed by user + challenge.
- **Anti-cheating at scale.** Hidden test cases raise the bar, but once this
  has real traffic, people will share working prompts for a given challenge.
  Rotating test inputs per-user (rather than using the same 2-3 hidden
  reviews for everyone) would close that gap.
- **More challenges, especially Expert tier** (tool-use/agent design,
  function-calling schemas, long-context management) — currently only
  Beginner, Intermediate, and Advanced have a challenge each, as a vertical
  slice of the full concept.
- **Real progression/gating** (e.g. unlock Advanced after N points on
  Intermediate) — tiers are informational only right now.

## Project structure

```
app/
  page.tsx                 challenge browser (home)
  target/[id]/page.tsx     one target — server component, strips hidden data
  api/grade/route.ts       runs the user's prompt against Claude + grades it
  api/coach/route.ts       Socratic hint chat + the "show me the fix" reveal
lib/
  challenges.ts            challenge definitions incl. hidden tests — SERVER ONLY
  types.ts                 shared types, incl. the sanitized PublicChallenge shape
  grading.ts                deterministic + judge grading
  anthropic.ts              prompting track's LLM call (Gemini), see above
  agent/                    agentic track: agent loop, Groq client, grading, judge
  agent-challenges/         agentic track: challenge repos + manifests — SERVER ONLY
  progress.ts                localStorage progress helpers (client only)
components/                 UI: prompt editor, score dial, results, coach panel, etc.
```

`lib/challenges.ts` holds hidden tests and reference solutions, so it must
only be imported from Server Components and API routes — never from a file
marked `"use client"`. `app/target/[id]/page.tsx` is the boundary: it calls
`toPublicChallenge()` to strip hidden fields before handing data to the
client-side `TargetClient` component.
