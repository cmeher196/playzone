import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBadmintonTournament, canManageBadmintonTournament, computeBadmintonStandings } from "@/lib/badminton-tournaments";
import { listPlayers } from "@/lib/registrations";
import type { PublicPlayer } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";
import { AddParticipantsForm } from "@/components/AddBadmintonParticipants";
import { CreateBadmintonMatchForm } from "@/components/CreateBadmintonMatch";
import { DeleteBadmintonTournament } from "@/components/DeleteBadmintonTournament";
import { BadmintonMatchManager } from "@/components/BadmintonMatchManager";
import { BadmintonRandomSchedule } from "@/components/BadmintonRandomSchedule";
import { BadmintonStandings, BadmintonPerformance } from "@/components/BadmintonStandings";
import { ShareTournamentButton } from "@/components/ShareTournamentButton";

export default async function BadmintonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const tournament = await getBadmintonTournament(id);
  if (!tournament) notFound();

  const manageable = canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" });

  // Get all registered players
  const allPlayers = await listPlayers();
  const availablePlayers = allPlayers
    .filter((p: PublicPlayer) => p.role !== "admin")
    .map((p: PublicPlayer) => ({ id: p.id, name: p.name, gender: p.gender, mobile: p.mobile }));

  // Map of playerId -> display name for match rendering
  const playerNames: Record<string, string> = {};
  for (const p of allPlayers) playerNames[p.id] = p.name;

  // Get participants already in tournament
  const tournamentParticipants = availablePlayers.filter((p) => tournament.participantIds.includes(p.id));

  // Points table + individual performance from completed matches
  const standings = computeBadmintonStandings(tournament);

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link href="/badminton" className="text-sm text-white/50 transition hover:text-white">
            ← Badminton
          </Link>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-orange-300">🏸 Badminton League</p>
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              {tournament.description && (
                <p className="mt-2 text-sm text-white/70">{tournament.description}</p>
              )}
              <p className="mt-1 text-sm text-white/50">
                {tournament.venue ? `📍 ${tournament.venue}` : "Venue TBA"} · {tournament.courtCount} court{tournament.courtCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className="text-4xl">🏸</span>
              <div className="flex flex-wrap justify-end gap-2">
                {manageable && <ShareTournamentButton href={`/join/badminton/${tournament.id}`} />}
                <Link
                  href={`/badminton/${tournament.id}/live`}
                  className="rounded-xl border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-300/20"
                >
                  📺 Watch Live
                </Link>
                {manageable && (
                  <DeleteBadmintonTournament tournamentId={tournament.id} tournamentName={tournament.name} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Courts */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Courts</h2>
            <span className="text-xs text-white/50">{tournament.courts.length} court{tournament.courts.length === 1 ? "" : "s"}</span>
          </div>
          {tournament.courts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tournament.courts.map((court) => (
                <div key={court.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-2xl font-bold text-orange-300">Court {court.number}</p>
                  <p className="mt-2 text-xs text-white/50">
                    {tournament.matches.filter((m) => m.courtId === court.id && m.status === "live").length} live match{tournament.matches.filter((m) => m.courtId === court.id && m.status === "live").length === 1 ? "" : "es"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/50">No courts created yet.</p>
          )}
        </section>

        {/* Matches */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Matches</h2>
            <span className="text-xs text-white/50">{tournament.matches.length} match{tournament.matches.length === 1 ? "" : "es"}</span>
          </div>
          {tournament.matches.length > 0 ? (
            <div className="space-y-2">
              {tournament.matches.map((match) => {
                const teamA =
                  match.format === "doubles"
                    ? `${playerNames[match.playerA] ?? match.playerA} / ${playerNames[match.playerC ?? ""] ?? match.playerC ?? ""}`
                    : playerNames[match.playerA] ?? match.playerA;
                const teamB =
                  match.format === "doubles"
                    ? `${playerNames[match.playerB] ?? match.playerB} / ${playerNames[match.playerD ?? ""] ?? match.playerD ?? ""}`
                    : playerNames[match.playerB] ?? match.playerB;
                return (
                  <div key={match.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/50">Court {tournament.courts.find((c) => c.id === match.courtId)?.number} · {match.format}</p>
                      <p className="mt-1 font-medium">
                        {teamA} <span className="text-white/30">vs</span> {teamB}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      match.status === "live"
                        ? "bg-rose-400/20 text-rose-300"
                        : match.status === "completed"
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-white/10 text-white/60"
                    }`}>
                      {match.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/50">No matches created yet.</p>
          )}
        </section>

        {/* Points table + individual performance (visible to everyone) */}
        <BadmintonStandings rows={standings} playerNames={playerNames} />
        <BadmintonPerformance rows={standings} playerNames={playerNames} />

        {/* Tournament Info */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 text-lg font-semibold">Tournament Info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-white/50">Organizer</p>
              <p className="mt-1 font-medium">{tournament.organizerName}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Status</p>
              <p className="mt-1 font-medium capitalize">{tournament.status}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Courts</p>
              <p className="mt-1 font-medium">{tournament.courtCount}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Created</p>
              <p className="mt-1 font-mono text-sm">{new Date(tournament.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        {/* Players */}
        {manageable && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="mb-4 text-lg font-semibold">Participants ({tournamentParticipants.length})</h2>
              {tournamentParticipants.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tournamentParticipants.map((player) => (
                    <div key={player.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-medium">{player.name}</p>
                      {player.gender && (
                        <p className="text-xs text-white/50 mt-1">{player.gender}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">No participants added yet</p>
              )}
            </section>

            <AddParticipantsForm
              tournamentId={tournament.id}
              availablePlayers={availablePlayers.filter((p) => !tournament.participantIds.includes(p.id))}
              existingIds={tournament.participantIds}
            />

            {tournamentParticipants.length > 0 && (
              <CreateBadmintonMatchForm
                tournamentId={tournament.id}
                courts={tournament.courts}
                participants={tournamentParticipants}
                defaultBestOf={tournament.bestOf ?? 3}
                defaultPointsToWin={tournament.pointsToWin ?? 21}
              />
            )}

            {tournamentParticipants.length > 0 && (
              <BadmintonRandomSchedule
                tournamentId={tournament.id}
                participantCount={tournamentParticipants.length}
                hasMatches={tournament.matches.length > 0}
              />
            )}

            <BadmintonMatchManager
              tournamentId={tournament.id}
              matches={tournament.matches}
              courts={tournament.courts}
              participants={tournamentParticipants}
              playerNames={playerNames}
              defaultBestOf={tournament.bestOf ?? 3}
              defaultPointsToWin={tournament.pointsToWin ?? 21}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}