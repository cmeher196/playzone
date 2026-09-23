import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listBadmintonTournaments, computeBadmintonStandings, type BadmintonStandingRow } from "@/lib/badminton-tournaments";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";

export default async function BadmintonRankingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tournaments = await listBadmintonTournaments();
  const players = await listPlayers();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  // Aggregate standings across every badminton tournament.
  const merged = new Map<string, BadmintonStandingRow>();
  for (const tournament of tournaments) {
    for (const row of computeBadmintonStandings(tournament)) {
      const existing = merged.get(row.playerId);
      if (!existing) {
        merged.set(row.playerId, { ...row });
      } else {
        existing.played += row.played;
        existing.won += row.won;
        existing.lost += row.lost;
        existing.gamesWon += row.gamesWon;
        existing.gamesLost += row.gamesLost;
        existing.pointsFor += row.pointsFor;
        existing.pointsAgainst += row.pointsAgainst;
      }
    }
  }
  const rows = [...merged.values()].sort(
    (a, b) =>
      b.won - a.won ||
      b.gamesWon - b.gamesLost - (a.gamesWon - a.gamesLost) ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst),
  );

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="mb-6">
        <p className="text-sm text-orange-300">🏸 Badminton only</p>
        <h1 className="text-2xl font-bold">Rankings</h1>
        <p className="mt-1 text-sm text-white/50">Aggregated across all badminton tournaments.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Leaderboard</h2>
          <span className="text-xs text-white/40">Wins · point difference</span>
        </div>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">Complete badminton matches to build rankings.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={row.playerId} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3">
                <span className="w-5 text-center text-sm text-orange-200">{index + 1}</span>
                <span className="flex-1 font-medium">{nameOf(row.playerId)}</span>
                <span className="text-sm text-white/50">{row.played} played</span>
                <span className="font-semibold text-orange-200">{row.won} W</span>
                <span className="w-16 text-right text-sm text-white/50">
                  {row.pointsFor - row.pointsAgainst >= 0 ? "+" : ""}
                  {row.pointsFor - row.pointsAgainst} PD
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}