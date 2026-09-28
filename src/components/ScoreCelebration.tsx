"use client";

import { useEffect } from "react";

export type CelebrationKind =
  | "run"
  | "four"
  | "six"
  | "wicket"
  | "duck"
  | "golden-duck"
  | "wide"
  | "no-ball"
  | "bye"
  | "leg-bye";

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
  wide: {
    emoji: "🙅",
    className: "border-purple-300/40 bg-purple-400/20 text-purple-100",
    big: false,
    duration: 1000,
  },
  "no-ball": {
    emoji: "🚫",
    className: "border-orange-300/40 bg-orange-400/20 text-orange-100",
    big: true,
    duration: 1300,
  },
  bye: {
    emoji: "🏃",
    className: "border-cyan-300/40 bg-cyan-400/20 text-cyan-100",
    big: false,
    duration: 1000,
  },
  "leg-bye": {
    emoji: "🦵",
    className: "border-teal-300/40 bg-teal-400/20 text-teal-100",
    big: false,
    duration: 1000,
  },
};

const BOUNDARY_STYLES: Record<
  "four" | "six",
  { emoji: string; text: string; ring: string; glow: string; particles: string[] }
> = {
  four: {
    emoji: "🏏",
    text: "text-amber-200",
    ring: "border-amber-300/70",
    glow: "#fbbf24",
    particles: ["🔥", "⭐", "✨", "🏏"],
  },
  six: {
    emoji: "🚀",
    text: "text-emerald-200",
    ring: "border-emerald-300/70",
    glow: "#34d399",
    particles: ["🚀", "⭐", "✨", "🎉"],
  },
};

// Fixed set of angles so particles fan out evenly — computed with plain
// trig (pure) rather than randomness, so it's stable across re-renders.
const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function BoundaryBurst({ kind, label }: { kind: "four" | "six"; label: string }) {
  const style = BOUNDARY_STYLES[kind];
  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <div
        className="boundary-glow absolute h-56 w-56 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${style.glow} 0%, transparent 70%)` }}
      />
      <div className={`boundary-ring absolute h-36 w-36 rounded-full border-4 ${style.ring}`} />
      {PARTICLE_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dx = Math.round(Math.cos(rad) * 100);
        const dy = Math.round(Math.sin(rad) * 100);
        return (
          <span
            key={angle}
            className="boundary-particle absolute text-2xl"
            style={{
              "--particle-dx": `${dx}px`,
              "--particle-dy": `${dy}px`,
              animationDelay: `${i * 35}ms`,
            } as React.CSSProperties}
          >
            {style.particles[i % style.particles.length]}
          </span>
        );
      })}
      <div className="boundary-text relative z-10 flex flex-col items-center gap-1">
        <div className="text-6xl drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">{style.emoji}</div>
        <div
          className={`text-6xl font-black italic tracking-wider drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] ${style.text}`}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/** Brief, non-blocking pop animation shown after a scoring action —
 * simple runs get a small toast near the action, wickets/ducks/extras get a
 * celebratory banner, and boundaries (four/six) get a full burst with
 * radiating particles. Auto-dismisses itself via `onDone`. */
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
  const isBoundary = celebration.kind === "four" || celebration.kind === "six";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {isBoundary ? (
        <div key={celebration.id} className="score-celebration">
          <BoundaryBurst kind={celebration.kind as "four" | "six"} label={celebration.label} />
        </div>
      ) : (
        <div
          key={celebration.id}
          className={`${style.big ? "score-celebration" : "score-toast"} flex flex-col items-center gap-1 rounded-3xl border px-8 py-6 text-center shadow-2xl backdrop-blur-sm ${style.className}`}
        >
          <div className={style.big ? "text-5xl" : "text-2xl"}>{style.emoji}</div>
          <div className={`font-extrabold tracking-wide ${style.big ? "text-2xl" : "text-sm"}`}>
            {celebration.label}
          </div>
        </div>
      )}
    </div>
  );
}
