"use client";

import type { ShotResult } from "@/lib/types";

const SHOT_LABEL: Record<ShotResult, string> = {
  bullseye: "Bullseye",
  inner: "Inner ring",
  outer: "Outer ring",
  "off-paper": "Off the paper",
};

const SHOT_COLOR: Record<ShotResult, string> = {
  bullseye: "#4caf6d",
  inner: "#c9a24b",
  outer: "#e0a52c",
  "off-paper": "#d1453d",
};

// Deterministic pseudo-random placement so the same score always lands the same spot.
function shotPosition(shot: ShotResult, score: number): { x: number; y: number } {
  const angle = (score * 37) % 360;
  const rad = (angle * Math.PI) / 180;
  const radiusByShot: Record<ShotResult, number> = {
    bullseye: 6 + (score % 10),
    inner: 32 + (score % 15),
    outer: 62 + (score % 18),
    "off-paper": 92 + (score % 6),
  };
  const r = radiusByShot[shot];
  return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) };
}

export default function ScoreDial({ score, shot }: { score: number; shot: ShotResult }) {
  const { x, y } = shotPosition(shot, score);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 200" className="h-40 w-40 sm:h-48 sm:w-48">
        <circle cx="100" cy="100" r="95" fill="#14171c" stroke="#262b33" strokeWidth="1" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="#d1453d" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="100" cy="100" r="55" fill="none" stroke="#e0a52c" strokeOpacity="0.45" strokeWidth="1" />
        <circle cx="100" cy="100" r="28" fill="none" stroke="#c9a24b" strokeOpacity="0.6" strokeWidth="1" />
        <circle cx="100" cy="100" r="6" fill="#c9a24b" fillOpacity="0.5" />
        <line x1="100" y1="5" x2="100" y2="195" stroke="#262b33" strokeWidth="1" />
        <line x1="5" y1="100" x2="195" y2="100" stroke="#262b33" strokeWidth="1" />

        <circle cx={x} cy={y} r="7" fill={SHOT_COLOR[shot]} stroke="#0b0d10" strokeWidth="2" />
      </svg>

      <div className="text-center">
        <div className="text-2xl font-semibold font-mono" style={{ color: SHOT_COLOR[shot] }}>
          {score}
          <span className="text-range-dim text-base">/100</span>
        </div>
        <div className="text-sm text-range-dim">{SHOT_LABEL[shot]}</div>
      </div>
    </div>
  );
}
