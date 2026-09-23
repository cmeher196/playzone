"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { BadmintonTournament, BadmintonMatch } from "@/lib/badminton-tournaments";

interface Props {
  initialTournament: BadmintonTournament;
  playerNames: Record<string, string>;
  heading?: string;
  tagline?: string;
}

function teamLabel(match: BadmintonMatch, side: "A" | "B", names: Record<string, string>): string {
  const nameOf = (id: string) => names[id] ?? id;
  if (side === "A") {
    return match.format === "doubles"
      ? `${nameOf(match.playerA)} / ${nameOf(match.playerC ?? "")}`
      : nameOf(match.playerA);
  }
  return match.format === "doubles"
    ? `${nameOf(match.playerB)} / ${nameOf(match.playerD ?? "")}`
    : nameOf(match.playerB);
}

export function BadmintonControlRoom({ initialTournament, playerNames, heading, tagline }: Props) {
  const [tournament, setTournament] = useState<BadmintonTournament>(initialTournament);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/badminton/tournaments/${initialTournament.id}`, { cache: "no-store" });
        if (res.ok) setTournament((await res.json()) as BadmintonTournament);
      } catch {
        /* ignore transient poll errors */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [initialTournament.id]);

  const liveCount = tournament.matches.filter((m) => m.status === "live").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/badminton/${tournament.id}`} className="text-sm text-white/50 transition hover:text-white">
          ← {tournament.name}
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-orange-300">{heading ?? "🎛️ Live Control Room"}</p>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            {tagline && <p className="mt-1 text-sm text-white/50">{tagline}</p>}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-rose-400/15 px-3 py-1.5 text-sm text-rose-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
            {liveCount} live
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournament.courts.map((court) => {
          // Prefer a live match on this court, else the most recent scheduled/paused one.
          const onCourt = tournament.matches.filter((m) => m.courtId === court.id);
          const active =
            onCourt.find((m) => m.status === "live") ??
            onCourt.find((m) => m.status === "paused") ??
            onCourt.find((m) => m.status === "scheduled" || m.status === "ready") ??
            onCourt.find((m) => m.status === "completed");

          const game = active?.games[active.currentGameIndex];
          const gamesWon = active?.games.reduce(
            (acc, g) => {
              if (g.winner === "playerA") acc.a += 1;
              else if (g.winner === "playerB") acc.b += 1;
              return acc;
            },
            { a: 0, b: 0 },
          );

          return (
            <div
              key={court.id}
              className={`rounded-2xl border p-5 transition ${
                active?.status === "live"
                  ? "border-rose-400/40 bg-rose-400/[0.06]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-orange-200">Court {court.number}</p>
                {active && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      active.status === "live"
                        ? "bg-rose-400/20 text-rose-300"
                        : active.status === "completed"
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-white/10 text-white/60"
                    }`}
                  >
                    {active.status}
                  </span>
                )}
              </div>

              {active ? (
                <Link href={`/badminton/${tournament.id}/matches/${active.id}/score`} className="mt-4 block">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm text-white/80">
                        {teamLabel(active, "A", playerNames)}
                      </span>
                      <span className="text-2xl font-bold tabular-nums">{game?.playerAScore ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm text-white/80">
                        {teamLabel(active, "B", playerNames)}
                      </span>
                      <span className="text-2xl font-bold tabular-nums">{game?.playerBScore ?? 0}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-white/40">
                    Games {gamesWon?.a ?? 0}–{gamesWon?.b ?? 0}
                    {active.assignedScorerId
                      ? ` · Scorer: ${playerNames[active.assignedScorerId] ?? active.assignedScorerId}`
                      : " · No scorer"}
                  </p>
                </Link>
              ) : (
                <p className="mt-4 text-sm text-white/40">No match scheduled</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
