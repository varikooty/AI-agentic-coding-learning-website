"use client";

/** Client-only progress tracking via localStorage. No backend/account in this MVP. */

const STORAGE_KEY = "the-range:progress";

interface ProgressStore {
  [challengeId: string]: {
    bestScore: number;
    attempts: number;
  };
}

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (private mode, quota) — progress just won't persist.
  }
}

export function getBestScore(challengeId: string): number | null {
  const store = readStore();
  return store[challengeId]?.bestScore ?? null;
}

export function recordAttempt(challengeId: string, score: number) {
  const store = readStore();
  const existing = store[challengeId];
  store[challengeId] = {
    bestScore: Math.max(existing?.bestScore ?? 0, score),
    attempts: (existing?.attempts ?? 0) + 1,
  };
  writeStore(store);
}

export function getAllProgress(): ProgressStore {
  return readStore();
}
