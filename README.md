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
  tool runs pytest as a plain subprocess (`lib/agent/pytestRunner.ts` +
  `lib/agent/pytest_runner.py`), so Python 3 + pytest need to be on `PATH`
  wherever this runs. It's *not* run in a Docker sandbox — see "A note on
  agentic-track isolation" below for why and what that trades away.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY and GROQ_API_KEY
pip install pytest           # needed for the agentic track's run_tests tool
npm run dev
```

Open http://localhost:3000.

## A note on agentic-track isolation

Earlier versions of this sandboxed `run_tests` inside a locked-down Docker
container (`--network none`, read-only filesystem, memory/CPU/pid caps).
That doesn't work on Render (or most PaaS Web Services): they run your app
in a single container with no Docker daemon reachable and no support for
privileged or nested containers — there's nowhere for a `docker run` call
to go. `pytest_runner.py` gets some of the way there with POSIX rlimits
(memory, CPU time, process count) and a wall-clock timeout that kills the
whole process group, but — unlike the Docker version — it does **not**
block network access or confine writes to the sandbox directory; a test
that goes out of its way to reach the network or write elsewhere in the
container's own filesystem still can. This runs LLM-authored code, not
adversarial input, but it's a real, accepted reduction in contained blast
radius, not an equivalent swap. If you need the Docker-level isolation
back, that requires a host that actually runs Docker (a VPS, a Fly.io
Machine, etc.) instead of a standard PaaS Web Service.

## Deploying

**Prompting-track-only** (no agentic track) is a standard Next.js app —
Vercel, Netlify, or Cloudflare Pages all work with zero config: import the
repo, set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) as an
environment variable, deploy.

**Both tracks, on Render**, using the root `Dockerfile` (verified locally —
builds, boots, and completes a full agentic run end-to-end):

1. Render dashboard → **New → Web Service** → connect this repo.
2. **Language / Environment**: `Docker`. Render finds the root `Dockerfile`
   automatically (leave **Dockerfile Path** as `./Dockerfile` and **Docker
   Build Context Directory** as `.`).
3. **Build Command** / **Start Command**: leave both blank — with the Docker
   environment, Render just runs `docker build` and then the image's `CMD`
   (`node server.js`); there's nothing to fill in separately.
4. **Port**: don't hardcode one in the dashboard. Render injects `PORT`
   (defaults to `10000`) and the standalone Next.js server reads
   `process.env.PORT` itself — the `Dockerfile` already `EXPOSE`s it as a
   default for local `docker run` use.
5. Environment variables: `GEMINI_API_KEY`, `GROQ_API_KEY`, and optionally
   `GEMINI_MODEL` / `AGENT_GROQ_MODEL` / `GROQ_BASE_URL`.
6. Deploy. First build takes a few minutes (multi-stage image); later
   builds reuse Docker layer caching.

This deploys the whole app, agentic track included — no separate
Docker-hosting step needed, since `run_tests` no longer shells out to a
Docker daemon (see the isolation note above for the trade-off that made
this possible).

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
