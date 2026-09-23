import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTournament } from "@/lib/tournaments";
import { PublicTournamentJoin } from "@/components/PublicTournamentJoin";
import { formatMatchDate } from "@/lib/format";

export default async function CricketTournamentInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const user = await getSessionUser();
  const joined = !!user && tournament.participants.some((participant) => participant.playerId === user.id);
  const details = [
    tournament.venue ? `Venue: ${tournament.venue}` : "",
    tournament.matchDates.length ? `Dates: ${tournament.matchDates.map(formatMatchDate).join(", ")}` : "",
    tournament.description ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <PublicTournamentJoin
      sport="cricket"
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      organizerName={tournament.organizerName}
      entryFee={tournament.entryFee}
      details={details}
      tournamentHref={`/tournaments/${tournament.id}`}
      signedIn={!!user}
      joined={joined}
    />
  );
}