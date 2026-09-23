import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBadmintonTournament } from "@/lib/badminton-tournaments";
import { PublicTournamentJoin } from "@/components/PublicTournamentJoin";

export default async function BadmintonTournamentInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getBadmintonTournament(id);
  if (!tournament) notFound();

  const user = await getSessionUser();
  const details = [
    tournament.venue ? `Venue: ${tournament.venue}` : "",
    `${tournament.courtCount} court${tournament.courtCount === 1 ? "" : "s"}`,
    tournament.description ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <PublicTournamentJoin
      sport="badminton"
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      organizerName={tournament.organizerName}
      details={details}
      tournamentHref={`/badminton/${tournament.id}`}
      signedIn={!!user}
      joined={!!user && tournament.participantIds.includes(user.id)}
    />
  );
}