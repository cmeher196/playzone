import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getScorerMatches } from "@/lib/badminton-tournaments";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";

export default async function BadmintonScoringDeskPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const assignments = await getScorerMatches(user.id);
  const players = await listPlayers();
  const playerNames: Record<string, string> = {};
  for (const p of players) playerNames[p.id] = p.name;
  const nameOf = (id: string) => playerNames[id] ?? id;

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-orange-300">🏸 Tournament operations</p>
          <h1 className="text-2xl font-bold">Scoring Desk</h1>
          <p className="mt-1 text-sm text-white/50">
            Matches you&apos;ve been assigned to score. Open one to record every rally.
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="font-medium">No matches assigned to you</p>
            <p className="mt-1 text-sm text-white/50">
              Ask a league organizer to assign you as the scorer for a match.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(({ tournament, match }) => {
              const teamA =
                match.format === "doubles"
                  ? `${nameOf(match.playerA)} / ${nameOf(match.playerC ?? "")}`
                  : nameOf(match.playerA);
              const teamB =
                match.format === "doubles"
                  ? `${nameOf(match.playerB)} / ${nameOf(match.playerD ?? "")}`
                  : nameOf(match.playerB);
              const courtNumber = tournament.courts.find((c) => c.id === match.courtId)?.number ?? "?";

              return (
                <Link
                  key={match.id}
                  href={`/badminton/${tournament.id}/matches/${match.id}/score`}
                  className="flex items-center gap-4 rounded-2xl border border-orange-300/20 bg-orange-300/[0.04] p-4 transition hover:border-orange-300/60"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-300/15 text-xl">
                    🏸
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-orange-200/70">
                      {tournament.name} · Court {courtNumber}
                    </p>
                    <p className="mt-1 truncate font-semibold">
                      {teamA} <span className="text-white/30">vs</span> {teamB}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      match.status === "live"
                        ? "bg-rose-400/20 text-rose-300"
                        : match.status === "completed"
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-white/10 text-white/60"
                    }`}
                  >
                    {match.status}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-orange-200">Open scorer →</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}