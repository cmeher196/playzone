import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament, canManageTournament } from "@/lib/tournaments";
import { getLiveMatch } from "@/lib/live-matches";
import { computeMatch } from "@/lib/live-scoring";
import { DashboardShell } from "@/components/DashboardShell";
import { Scorer } from "@/components/Scorer";
import { LiveScoreboard } from "@/components/LiveScoreboard";
import { RescheduleMatch } from "@/components/RescheduleMatch";
import { BackButton } from "@/components/BackButton";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { matchId } = await params;
  const match = await getLiveMatch(matchId);
  if (!match) notFound();

  const live = computeMatch(match);
  const tournament = await getTournament(match.tournamentId);
  const canScore = canManageTournament(tournament ?? { organizerId: "" }, {
    id: user.id,
    isAdmin: isAdmin(user),
  });
  const data = { match, live };

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <BackButton fallbackHref={`/tournaments/${match.tournamentId}`}>
        ← {tournament?.name ?? "Tournament"}
      </BackButton>

      <div className="mt-2 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {match.teamA.name} <span className="text-white/40">vs</span>{" "}
          {match.teamB.name}
        </h1>
        {canScore && match.status !== "completed" && (
          <div className="flex items-center gap-2">
            {match.status === "scheduled" && <RescheduleMatch matchId={match.id} date={match.date} venue={match.venue} />}
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">Scorer mode</span>
          </div>
        )}
      </div>

      {canScore && match.status !== "completed" ? (
        <Scorer matchId={match.id} initial={data} />
      ) : (
        <LiveScoreboard matchId={match.id} initial={data} />
      )}
    </DashboardShell>
  );
}
