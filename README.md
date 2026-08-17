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

The grading and coach calls hit an LLM. `lib/anthropic.ts` (name kept for a
small diff — it no longer touches Anthropic) is the one place that talks to
the model, called exclusively from `app/api/*/route.ts`. Even though the
current backend (Ollama, see below) doesn't need a secret key, keeping the
model call server-side still matters: it's what let this run against a paid
Anthropic API earlier without ever shipping a key to the browser, and it's
what would let this swap back to a hosted API later without touching
`grading.ts` or any component.

### Running against a local model (current default)

This currently calls a local [Ollama](https://ollama.com) server instead of
a hosted API — free, unlimited, fully offline, at the cost of noticeably
rougher grading than Claude on the fuzzier challenges (especially the
ambiguous test case in Format Lock-In and the judge calls in Injection
Resistance).

1. Install Ollama: https://ollama.com/download. It runs a local API at
   `http://localhost:11434`.
2. Pull a model: `ollama pull llama3.1:8b` (~4-5GB, one-time).
3. Sanity-check it works standalone: `ollama run llama3.1:8b`.
4. `npm install && cp .env.example .env.local` (defaults already point at
   `localhost:11434` / `llama3.1:8b` — edit `.env.local` if you used a
   different model).
5. `npm run dev`, open http://localhost:3000, and fire a target. Ollama must
   already be running.

### Switching back to a hosted API

Swap the body of `runPrompt()` in `lib/anthropic.ts` back to calling
Anthropic (or any other provider) — it's the only function `grading.ts` and
the API routes depend on, so nothing else needs to change. Keep whatever
API key server-side only, exactly as `lib/anthropic.ts` does now.

## Deploying

**A plain `vercel deploy` won't work with the current Ollama backend** —
Vercel's serverless functions would try to reach `localhost:11434` on
*their* machine, not yours, and there's nothing running there. Two ways to
actually ship this:

- **Swap back to a hosted API** (see above) before deploying — then a normal
  Vercel/Netlify/Cloudflare Pages deploy works exactly as it did originally:
  import the repo, set the provider's API key as an environment variable,
  deploy. The API routes run as serverless functions automatically.
- **Keep Ollama, but make it reachable from the deployed app** — e.g. run
  Ollama on a server/VPS Vercel can reach and point `OLLAMA_BASE_URL` at it,
  or self-host the whole Next.js app (Docker, a VPS, etc.) on the same
  machine as Ollama. There's no way to reach a laptop's `localhost` from a
  serverless deploy.

For local-only use (running on your own machine), none of this matters —
`npm run dev` or `npm run build && npm start` talk straight to your own
Ollama instance.

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
  anthropic.ts              the LLM call — currently Ollama, see above
  progress.ts                localStorage progress helpers (client only)
components/                 UI: prompt editor, score dial, results, coach panel, etc.
```

`lib/challenges.ts` holds hidden tests and reference solutions, so it must
only be imported from Server Components and API routes — never from a file
marked `"use client"`. `app/target/[id]/page.tsx` is the boundary: it calls
`toPublicChallenge()` to strip hidden fields before handing data to the
client-side `TargetClient` component.
