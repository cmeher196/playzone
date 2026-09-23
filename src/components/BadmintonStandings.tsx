import type { BadmintonStandingRow } from "@/lib/badminton-tournaments";

export function BadmintonStandings({
  rows,
  playerNames,
}: {
  rows: BadmintonStandingRow[];
  playerNames: Record<string, string>;
}) {
  const nameOf = (id: string) => playerNames[id] ?? id;

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-2 text-lg font-semibold">Points Table</h2>
        <p className="text-sm text-white/50">Standings appear once matches are completed.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="mb-4 text-lg font-semibold">Points Table</h2>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Player</th>
              <th className="p-3 text-center">P</th>
              <th className="p-3 text-center">W</th>
              <th className="p-3 text-center">L</th>
              <th className="p-3 text-center">Games</th>
              <th className="p-3 text-center">Pts +/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.playerId} className="border-t border-white/10">
                <td className="p-3 text-white/40">{i + 1}</td>
                <td className="p-3 font-medium">{nameOf(r.playerId)}</td>
                <td className="p-3 text-center">{r.played}</td>
                <td className="p-3 text-center text-emerald-300">{r.won}</td>
                <td className="p-3 text-center text-rose-300">{r.lost}</td>
                <td className="p-3 text-center text-white/70">
                  {r.gamesWon}–{r.gamesLost}
                </td>
                <td className="p-3 text-center text-white/70">
                  {r.pointsFor - r.pointsAgainst >= 0 ? "+" : ""}
                  {r.pointsFor - r.pointsAgainst}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BadmintonPerformance({
  rows,
  playerNames,
}: {
  rows: BadmintonStandingRow[];
  playerNames: Record<string, string>;
}) {
  const nameOf = (id: string) => playerNames[id] ?? id;

  if (rows.length === 0) return null;

  // Highlight cards: most wins, most points scored, best win rate (min 1 game).
  const mostWins = [...rows].sort((a, b) => b.won - a.won)[0];
  const mostPoints = [...rows].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  const bestRate = [...rows]
    .filter((r) => r.played > 0)
    .sort((a, b) => b.won / b.played - a.won / a.played)[0];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="mb-4 text-lg font-semibold">Individual Performance</h2>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
          <p className="text-xs text-emerald-200/70">🏆 Most wins</p>
          <p className="mt-1 font-semibold">{mostWins ? nameOf(mostWins.playerId) : "—"}</p>
          <p className="text-xs text-white/50">{mostWins?.won ?? 0} wins</p>
        </div>
        <div className="rounded-xl border border-orange-300/20 bg-orange-300/[0.06] p-4">
          <p className="text-xs text-orange-200/70">🎯 Most points</p>
          <p className="mt-1 font-semibold">{mostPoints ? nameOf(mostPoints.playerId) : "—"}</p>
          <p className="text-xs text-white/50">{mostPoints?.pointsFor ?? 0} points</p>
        </div>
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.06] p-4">
          <p className="text-xs text-sky-200/70">📈 Best win rate</p>
          <p className="mt-1 font-semibold">{bestRate ? nameOf(bestRate.playerId) : "—"}</p>
          <p className="text-xs text-white/50">
            {bestRate ? Math.round((bestRate.won / bestRate.played) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => {
          const rate = r.played > 0 ? Math.round((r.won / r.played) * 100) : 0;
          return (
            <div key={r.playerId} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{nameOf(r.playerId)}</p>
                <p className="text-sm text-white/60">
                  {r.won}W · {r.lost}L · {rate}%
                </p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/50">
                <span>Played: {r.played}</span>
                <span>
                  Games: {r.gamesWon}–{r.gamesLost}
                </span>
                <span>
                  Points: {r.pointsFor}/{r.pointsAgainst}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
