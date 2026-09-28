"use client";

import { useEffect, useRef, useState } from "react";
import { ScoreboardView, type ScoreboardData } from "./ScoreboardView";
import { ScoreCelebration, type Celebration } from "./ScoreCelebration";

/**
 * Diffs the previous poll against the newly fetched data to infer what just
 * happened — a wicket (with duck/golden duck detection), a boundary, or a
 * plain run — so viewers get the same celebration the scorer sees, without
 * any of it being broadcast server-side.
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

  if (newEntries.some((entry) => entry.label === "6")) return { kind: "six", label: "SIX!" };
  if (newEntries.some((entry) => entry.label === "4")) return { kind: "four", label: "FOUR!" };

  const runs = Number(newEntries[newEntries.length - 1].label);
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
