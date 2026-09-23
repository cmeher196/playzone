import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTournament,
  getBadmintonMatch,
  canManageBadmintonTournament,
  tallyPlayerPoints,
  resolveMatchRules,
} from "@/lib/badminton-tournaments";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";
import { BadmintonLiveScorer } from "@/components/BadmintonLiveScorer";

export default async function BadmintonScorePage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id, matchId } = await params;
  const tournament = await getBadmintonTournament(id);
  if (!tournament) notFound();

  const match = await getBadmintonMatch(id, matchId);
  if (!match) notFound();

  const isOwnerOrAdmin = canManageBadmintonTournament(tournament, {
    id: user.id,
    isAdmin: user.role === "admin",
  });
  const canScore = isOwnerOrAdmin || match.assignedScorerId === user.id;

  const players = await listPlayers();
  const playerNames: Record<string, string> = {};
  for (const p of players) playerNames[p.id] = p.name;

  const rules = resolveMatchRules(tournament, match);

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <BadmintonLiveScorer
        tournamentId={id}
        initialMatch={match}
        initialPlayerPoints={tallyPlayerPoints(tournament, match)}
        initialBestOf={rules.bestOf}
        initialPointsToWin={rules.pointsToWin}
        playerNames={playerNames}
        canScore={canScore}
      />
    </DashboardShell>
  );
}
