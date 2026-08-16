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

The grading and coach calls hit the Anthropic API with a real API key. That
key is only ever read server-side (`lib/anthropic.ts`, used exclusively from
`app/api/*/route.ts`) — it's never sent to the browser. A version of this
that called the Anthropic API directly from client-side JavaScript would leak
the key to anyone who opened dev tools, so the Next.js API routes exist
specifically to keep the key server-side while still serving a fully static
frontend everywhere else.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Deploying

This is a standard Next.js app (frontend + serverless API routes in one
deploy), so the simplest path is:

1. **Vercel** — import this repo at https://vercel.com/new. Vercel detects
   Next.js automatically; no build config needed.
2. Set the environment variable `ANTHROPIC_API_KEY` (and optionally
   `ANTHROPIC_MODEL`) in the Vercel project's Settings → Environment
   Variables. Get a key at https://console.anthropic.com/.
3. Deploy. The API routes (`/api/grade`, `/api/coach`) run as serverless
   functions automatically — nothing else to configure.

Netlify or Cloudflare Pages work the same way (both support Next.js API
routes/functions natively) if you'd rather not use Vercel.

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
  anthropic.ts              thin Anthropic SDK wrapper
  progress.ts                localStorage progress helpers (client only)
components/                 UI: prompt editor, score dial, results, coach panel, etc.
```

`lib/challenges.ts` holds hidden tests and reference solutions, so it must
only be imported from Server Components and API routes — never from a file
marked `"use client"`. `app/target/[id]/page.tsx` is the boundary: it calls
`toPublicChallenge()` to strip hidden fields before handing data to the
client-side `TargetClient` component.
