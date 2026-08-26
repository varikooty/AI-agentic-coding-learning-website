# Next.js production image using `output: "standalone"` (next.config.js) —
# ships only the traced server + dependencies, not the full node_modules.
#
# The agentic track's run_tests tool runs pytest as a plain subprocess
# (lib/agent/pytestRunner.ts + pytest_runner.py) rather than in a nested
# Docker container, because Render's standard Web Service containers don't
# expose a Docker daemon or support privileged/nested containers. That
# means Python + pytest need to live in this same image.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 py3-pytest

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# `standalone` only traces files reachable via require/import. These two
# are read at runtime via fs on a process.cwd()-relative path instead, not
# imported — Next's tracer won't see them, so they're copied in explicitly
# at the same path:
#  - the agentic track's challenge repos (lib/agent-challenges/**/repo/*.py)
#  - the pytest rlimit wrapper (lib/agent/pytest_runner.py), shelled out to
#    by lib/agent/pytestRunner.ts
COPY --from=builder --chown=nextjs:nodejs /app/lib/agent-challenges ./lib/agent-challenges
COPY --from=builder --chown=nextjs:nodejs /app/lib/agent/pytest_runner.py ./lib/agent/pytest_runner.py

USER nextjs

# Render injects PORT (default 10000) and expects the app to bind 0.0.0.0.
# The standalone server.js reads process.env.PORT itself, so no extra flag
# is needed — just make sure PORT is set (Render sets it; this is the local
# fallback for `docker run` outside Render).
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
