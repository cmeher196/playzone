"use client";

import { useEffect, useState } from "react";
import { ScoreboardView, type ScoreboardData } from "./ScoreboardView";

export function LiveScoreboard({
  matchId,
  initial,
}: {
  matchId: string;
  initial: ScoreboardData;
}) {
  const [data, setData] = useState<ScoreboardData>(initial);

  useEffect(() => {
    if (data.match.status === "completed") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`, {
          cache: "no-store",
        });
        if (res.ok) setData((await res.json()) as ScoreboardData);
      } catch {
        // transient network error — keep last known state
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [matchId, data.match.status]);

  return <ScoreboardView data={data} />;
}
