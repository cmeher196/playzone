"use client";

import { useEffect } from "react";

export type CelebrationKind = "run" | "four" | "six" | "wicket" | "duck" | "golden-duck";

export interface Celebration {
  id: number;
  kind: CelebrationKind;
  label: string;
}

const STYLES: Record<
  CelebrationKind,
  { emoji: string; className: string; big: boolean; duration: number }
> = {
  run: {
    emoji: "🏃",
    className: "border-white/15 bg-white/10 text-white",
    big: false,
    duration: 900,
  },
  four: {
    emoji: "🏏",
    className: "border-amber-300/40 bg-amber-400/20 text-amber-100",
    big: true,
    duration: 1500,
  },
  six: {
    emoji: "🚀",
    className: "border-emerald-300/40 bg-emerald-400/20 text-emerald-100",
    big: true,
    duration: 1500,
  },
  wicket: {
    emoji: "🎯",
    className: "border-rose-400/40 bg-rose-500/20 text-rose-100",
    big: true,
    duration: 1500,
  },
  duck: {
    emoji: "🦆",
    className: "border-sky-400/40 bg-sky-500/20 text-sky-100",
    big: true,
    duration: 1500,
  },
  "golden-duck": {
    emoji: "🥇",
    className: "border-yellow-300/40 bg-yellow-400/20 text-yellow-100",
    big: true,
    duration: 1500,
  },
};

/** Brief, non-blocking pop animation shown after a scoring action —
 * simple runs get a small toast near the action, boundaries/wickets/ducks
 * get a bigger celebratory banner. Auto-dismisses itself via `onDone`. */
export function ScoreCelebration({
  celebration,
  onDone,
}: {
  celebration: Celebration | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(onDone, STYLES[celebration.kind].duration);
    return () => window.clearTimeout(timer);
  }, [celebration, onDone]);

  if (!celebration) return null;
  const style = STYLES[celebration.kind];

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        key={celebration.id}
        className={`${style.big ? "score-celebration" : "score-toast"} flex flex-col items-center gap-1 rounded-3xl border px-8 py-6 text-center shadow-2xl backdrop-blur-sm ${style.className}`}
      >
        <div className={style.big ? "text-5xl" : "text-2xl"}>{style.emoji}</div>
        <div className={`font-extrabold tracking-wide ${style.big ? "text-2xl" : "text-sm"}`}>
          {celebration.label}
        </div>
      </div>
    </div>
  );
}
