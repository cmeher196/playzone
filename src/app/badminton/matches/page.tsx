import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listBadmintonTournaments } from "@/lib/badminton-tournaments";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";

export default async function BadmintonMatchesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tournaments = await listBadmintonTournaments();
  const players = await listPlayers();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  // Matches where the user plays or is the assigned scorer.
  const mine = tournaments.flatMap((tournament) =>
    tournament.matches
      .filter(
        (m) =>
          m.assignedScorerId === user.id ||
          [m.playerA, m.playerB, m.playerC, m.playerD].includes(user.id),
      )
      .map((match) => ({ match, tournament })),
  );

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="mb-6">
        <p className="text-sm text-orange-300">🏸 Badminton circuit</p>
        <h1 className="text-2xl font-bold">My Matches</h1>
        <p className="mt-1 text-sm text-white/50">Fixtures where you play or score.</p>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
          You have no badminton matches yet.
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map(({ match, tournament }) => {
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
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-orange-300/50"
              >
                <div className="min-w-0">
                  <p className="text-xs text-white/40">
                    {tournament.name} · {match.round ? `${match.round} · ` : ""}Court {courtNumber}
                  </p>
                  <p className="mt-1 truncate font-semibold">
                    {match.playerA ? teamA : "TBD"} <span className="text-white/30">vs</span>{" "}
                    {match.playerB ? teamB : "TBD"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    match.status === "live"
                      ? "bg-rose-400/20 text-rose-300"
                      : match.status === "completed"
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-white/10 text-white/60"
                  }`}
                >
                  {match.isBye ? "bye" : match.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}