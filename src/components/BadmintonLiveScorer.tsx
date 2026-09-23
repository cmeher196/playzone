"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BadmintonMatch } from "@/lib/badminton-tournaments";

interface Props {
  tournamentId: string;
  initialMatch: BadmintonMatch;
  initialPlayerPoints: Record<string, number>;
  initialBestOf: number;
  initialPointsToWin: number;
  playerNames: Record<string, string>;
  canScore: boolean;
}

type MatchWithPoints = BadmintonMatch & { playerPoints?: Record<string, number> };

/** Sum of points across all games equals the number of score events (the sequence). */
function computeSequence(match: BadmintonMatch): number {
  return match.games.reduce((sum, g) => sum + g.playerAScore + g.playerBScore, 0);
}

export function BadmintonLiveScorer({
  tournamentId,
  initialMatch,
  initialPlayerPoints,
  initialBestOf,
  initialPointsToWin,
  playerNames,
  canScore,
}: Props) {
  const [match, setMatch] = useState<BadmintonMatch>(initialMatch);
  const [playerPoints, setPlayerPoints] = useState<Record<string, number>>(initialPlayerPoints);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bestOf, setBestOf] = useState(initialBestOf);
  const [pointsToWin, setPointsToWin] = useState(initialPointsToWin);
  const [settingsMsg, setSettingsMsg] = useState("");
  const scoreUrl = `/api/badminton/tournaments/${tournamentId}/matches/${match.id}`;

  const nameOf = (id: string) => playerNames[id] ?? id;
  const isDoubles = match.format === "doubles";
  const sideAPlayers = [match.playerA, match.playerC].filter(Boolean) as string[];
  const sideBPlayers = [match.playerB, match.playerD].filter(Boolean) as string[];
  const teamA = isDoubles ? sideAPlayers.map(nameOf).join(" / ") : nameOf(match.playerA);
  const teamB = isDoubles ? sideBPlayers.map(nameOf).join(" / ") : nameOf(match.playerB);

  /** The player who scored strictly more than their partner, or null if tied/solo. */
  const manOfTeam = (ids: string[]): string | null => {
    if (ids.length < 2) return null;
    const sorted = [...ids].sort((a, b) => (playerPoints[b] ?? 0) - (playerPoints[a] ?? 0));
    const top = playerPoints[sorted[0]] ?? 0;
    const second = playerPoints[sorted[1]] ?? 0;
    return top > 0 && top > second ? sorted[0] : null;
  };

  const game = match.games[match.currentGameIndex];
  const gamesWon = match.games.reduce(
    (acc, g) => {
      if (g.winner === "playerA") acc.a += 1;
      else if (g.winner === "playerB") acc.b += 1;
      return acc;
    },
    { a: 0, b: 0 },
  );

  // Poll for external updates (owner pause/reassign, corrections).
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    const timer = setInterval(async () => {
      if (busyRef.current) return;
      try {
        const res = await fetch(scoreUrl, { cache: "no-store" });
        if (res.ok) {
          const fresh = (await res.json()) as MatchWithPoints;
          setMatch(fresh);
          if (fresh.playerPoints) setPlayerPoints(fresh.playerPoints);
        }
      } catch {
        /* ignore transient poll errors */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [scoreUrl]);

  const sendPoint = useCallback(
    async (side: "playerA" | "playerB", playerId?: string) => {
      setError("");
      setBusy(true);
      try {
        const res = await fetch(`${scoreUrl}/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "point", side, playerId, expectedSequence: computeSequence(match) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 409) {
            // Someone else changed the score; refresh and let the user retry.
            const refresh = await fetch(scoreUrl, { cache: "no-store" });
            if (refresh.ok) {
              const fresh = (await refresh.json()) as MatchWithPoints;
              setMatch(fresh);
              if (fresh.playerPoints) setPlayerPoints(fresh.playerPoints);
            }
            setError("Score was updated elsewhere — refreshed. Try again.");
          } else {
            setError(data.error ?? "Could not record point");
          }
          return;
        }
        setMatch(data.match as BadmintonMatch);
        if (data.playerPoints) setPlayerPoints(data.playerPoints as Record<string, number>);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setBusy(false);
      }
    },
    [match, scoreUrl],
  );

  const undo = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${scoreUrl}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not undo");
        return;
      }
      setMatch(data.match as BadmintonMatch);
      if (data.playerPoints) setPlayerPoints(data.playerPoints as Record<string, number>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }, [scoreUrl]);

  const saveSettings = useCallback(async () => {
    setError("");
    setSettingsMsg("");
    setBusy(true);
    try {
      const res = await fetch(scoreUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bestOf: Math.max(1, Math.min(15, Number.isFinite(bestOf) ? bestOf : 3)),
          pointsToWin: Math.max(5, Math.min(99, Number.isFinite(pointsToWin) ? pointsToWin : 21)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not update settings");
        return;
      }
      setMatch(data as BadmintonMatch);
      setSettingsMsg("Settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }, [scoreUrl, bestOf, pointsToWin]);

  const isComplete = match.status === "completed" || !!match.matchWinner;
  const isLive = match.status === "live";
  const winnerName = match.matchWinner === "playerA" ? teamA : match.matchWinner === "playerB" ? teamB : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/badminton/${tournamentId}`} className="text-sm text-white/50 transition hover:text-white">
          ← Back to league
        </Link>
        <h1 className="mt-3 text-2xl font-bold">
          {teamA} <span className="text-white/30">vs</span> {teamB}
        </h1>
        <p className="mt-1 text-sm text-white/50 capitalize">
          {match.format} · {match.status}
          {" · "}Games {gamesWon.a}–{gamesWon.b}
        </p>
      </div>

      {isComplete && winnerName && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-center">
          <p className="text-sm text-emerald-200">Match complete</p>
          <p className="mt-1 text-xl font-bold text-emerald-100">🏆 {winnerName} wins</p>
        </div>
      )}

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="truncate text-sm text-white/60">{teamA}</p>
          <p className="mt-2 text-6xl font-bold tabular-nums">{game?.playerAScore ?? 0}</p>
          <p className="mt-2 text-xs text-white/40">Games won: {gamesWon.a}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="truncate text-sm text-white/60">{teamB}</p>
          <p className="mt-2 text-6xl font-bold tabular-nums">{game?.playerBScore ?? 0}</p>
          <p className="mt-2 text-xs text-white/40">Games won: {gamesWon.b}</p>
        </div>
      </div>

      {/* Per-game breakdown */}
      <div className="flex flex-wrap gap-2">
        {match.games.map((g, i) => (
          <span
            key={i}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              i === match.currentGameIndex && !isComplete
                ? "border-orange-300/50 bg-orange-300/10 text-orange-200"
                : "border-white/10 bg-white/5 text-white/60"
            }`}
          >
            G{i + 1}: {g.playerAScore}–{g.playerBScore}
            {g.winner ? (g.winner === "playerA" ? " ✓A" : " ✓B") : ""}
          </span>
        ))}
      </div>

      {canScore && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-white/80"
          >
            <span>
              ⚙ Match settings — best of {match.bestOf ?? initialBestOf}, {match.pointsToWin ?? initialPointsToWin} points
            </span>
            <span className="text-white/40">{settingsOpen ? "▲" : "▼"}</span>
          </button>
          {settingsOpen && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-white/60">
                  Games (best of)
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={Number.isNaN(bestOf) ? "" : bestOf}
                    onChange={(e) => setBestOf(e.target.valueAsNumber)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none"
                  />
                </label>
                <label className="text-xs text-white/60">
                  Points to win
                  <input
                    type="number"
                    min={5}
                    max={99}
                    value={Number.isNaN(pointsToWin) ? "" : pointsToWin}
                    onChange={(e) => setPointsToWin(e.target.valueAsNumber)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={saveSettings}
                className="w-full rounded-lg bg-orange-400 px-3 py-2 text-sm font-semibold text-orange-950 transition hover:bg-orange-300 disabled:opacity-50"
              >
                Save settings
              </button>
              {settingsMsg && <p className="text-xs text-emerald-300">{settingsMsg}</p>}
              <p className="text-xs text-white/40">Applies live — lowering points may settle the current game immediately.</p>
            </div>
          )}
        </div>
      )}

      {/* Doubles: per-player points + each team's man of the match */}
      {isDoubles && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { ids: sideAPlayers, accent: "text-emerald-300" },
            { ids: sideBPlayers, accent: "text-sky-300" },
          ].map((side, idx) => {
            const motm = manOfTeam(side.ids);
            return (
              <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Points by player</p>
                <ul className="space-y-1.5">
                  {side.ids.map((pid) => (
                    <li key={pid} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">
                        {nameOf(pid)}
                        {motm === pid && (
                          <span className="ml-1 text-amber-300" title="Top scorer">
                            ★
                          </span>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums">{playerPoints[pid] ?? 0}</span>
                    </li>
                  ))}
                </ul>
                {isComplete && motm && (
                  <p className={`mt-3 border-t border-white/10 pt-2 text-xs font-medium ${side.accent}`}>
                    🏅 Man of the match: {nameOf(motm)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {/* Controls */}
      {canScore ? (
        isLive ? (
          <div className="space-y-3">
            {isDoubles ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {sideAPlayers.map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      disabled={busy}
                      onClick={() => sendPoint("playerA", pid)}
                      className="w-full rounded-2xl bg-emerald-500 px-4 py-6 text-base font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      + Point
                      <span className="mt-1 block truncate text-sm font-medium opacity-80">{nameOf(pid)}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {sideBPlayers.map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      disabled={busy}
                      onClick={() => sendPoint("playerB", pid)}
                      className="w-full rounded-2xl bg-sky-500 px-4 py-6 text-base font-bold text-sky-950 transition hover:bg-sky-400 disabled:opacity-50"
                    >
                      + Point
                      <span className="mt-1 block truncate text-sm font-medium opacity-80">{nameOf(pid)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => sendPoint("playerA")}
                  className="rounded-2xl bg-emerald-500 px-6 py-8 text-lg font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  + Point
                  <span className="mt-1 block truncate text-sm font-medium opacity-80">{teamA}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => sendPoint("playerB")}
                  className="rounded-2xl bg-sky-500 px-6 py-8 text-lg font-bold text-sky-950 transition hover:bg-sky-400 disabled:opacity-50"
                >
                  + Point
                  <span className="mt-1 block truncate text-sm font-medium opacity-80">{teamB}</span>
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={undo}
              className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              ↩ Undo last point
            </button>
          </div>
        ) : (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
            This match is <span className="font-medium text-white/80">{match.status}</span>. Scoring is available once
            the match is live.
          </p>
        )
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
          You are viewing this match. Only the assigned scorer can record points.
        </p>
      )}
    </div>
  );
}
