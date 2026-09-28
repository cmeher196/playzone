"use client";

import { useEffect, useRef, useState } from "react";
import { ScoreboardView, type ScoreboardData } from "./ScoreboardView";
import { ScoreCelebration, type Celebration } from "./ScoreCelebration";

/** Parses a commentary label like "4", "3wd", "nb", "2lb", "b" into the
 * extra type (if any) and the runs it represents — mirrors the label
 * formats produced by `reduceInnings` in live-scoring.ts. */
function parseLabel(label: string): {
  extra: "wide" | "no-ball" | "bye" | "leg-bye" | null;
  runs: number;
} {
  const wd = /^(\d*)wd$/.exec(label);
  if (wd) return { extra: "wide", runs: wd[1] ? Number(wd[1]) : 0 };
  const nb = /^(\d*)nb$/.exec(label);
  if (nb) return { extra: "no-ball", runs: nb[1] ? Number(nb[1]) : 0 };
  const lb = /^(\d+)lb$/.exec(label);
  if (lb) return { extra: "leg-bye", runs: Number(lb[1]) };
  const b = /^(\d+)b$/.exec(label);
  if (b) return { extra: "bye", runs: Number(b[1]) };
  return { extra: null, runs: Number(label) };
}

/**
 * Diffs the previous poll against the newly fetched data to infer what just
 * happened — a wicket (with duck/golden duck detection), a boundary, an
 * extra (wide/no-ball/bye/leg-bye), or a plain run — so viewers get the same
 * celebration the scorer sees, without any of it being broadcast
 * server-side.
 */
function detectCelebration(
  prev: ScoreboardData,
  next: ScoreboardData,
): Omit<Celebration, "id"> | null {
  if (prev.live.currentInnings !== next.live.currentInnings) return null;
  const prevInnings = prev.live.innings[prev.live.currentInnings];
  const nextInnings = next.live.innings[next.live.currentInnings];
  if (!prevInnings || !nextInnings) return null;

  const newEntries = nextInnings.commentary.slice(prevInnings.commentary.length);
  if (newEntries.length === 0) return null;

  const wicketEntry = newEntries.find((entry) => entry.wicket);
  if (wicketEntry) {
    const prevOutIds = new Set(prevInnings.batters.filter((b) => b.out).map((b) => b.playerId));
    const dismissed = nextInnings.batters.find((b) => b.out && !prevOutIds.has(b.playerId));
    if (dismissed && dismissed.runs === 0) {
      return dismissed.balls <= 1
        ? { kind: "golden-duck", label: "GOLDEN DUCK!" }
        : { kind: "duck", label: "DUCK!" };
    }
    return { kind: "wicket", label: "WICKET!" };
  }

  const { extra, runs } = parseLabel(newEntries[newEntries.length - 1].label);
  if (extra === "no-ball") {
    if (runs === 4) return { kind: "four", label: "FOUR!" };
    if (runs === 6) return { kind: "six", label: "SIX!" };
    return { kind: "no-ball", label: "No Ball!" };
  }
  if (extra === "wide") {
    const total = 1 + runs;
    return { kind: "wide", label: total > 1 ? `${total} Wides` : "Wide" };
  }
  if (extra === "leg-bye") {
    return { kind: "leg-bye", label: runs > 1 ? `Leg Bye +${runs}` : "Leg Bye" };
  }
  if (extra === "bye") {
    return { kind: "bye", label: runs > 1 ? `Bye +${runs}` : "Bye" };
  }
  if (runs === 4) return { kind: "four", label: "FOUR!" };
  if (runs === 6) return { kind: "six", label: "SIX!" };
  if (!Number.isNaN(runs)) {
    return { kind: "run", label: runs === 0 ? "Dot ball" : `+${runs} Run${runs > 1 ? "s" : ""}` };
  }
  return null;
}

export function LiveScoreboard({
  matchId,
  initial,
}: {
  matchId: string;
  initial: ScoreboardData;
}) {
  const [data, setData] = useState<ScoreboardData>(initial);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const dataRef = useRef(data);
  const celebrationCounter = useRef(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (data.match.status === "completed") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const next = (await res.json()) as ScoreboardData;
        const detected = detectCelebration(dataRef.current, next);
        if (detected) {
          celebrationCounter.current += 1;
          setCelebration({ ...detected, id: celebrationCounter.current });
        }
        setData(next);
      } catch {
        // transient network error — keep last known state
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [matchId, data.match.status]);

  return (
    <>
      <ScoreCelebration celebration={celebration} onDone={() => setCelebration(null)} />
      <ScoreboardView data={data} />
    </>
  );
}
