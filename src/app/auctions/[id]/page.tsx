import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAuction, isAuctionOwner } from "@/lib/auctions";
import { isAdmin } from "@/lib/admin";
import { listTeams, listTeamsForTournament } from "@/lib/teams";
import { DashboardShell } from "@/components/DashboardShell";
import { AuctionRoom } from "@/components/AuctionRoom";

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const auction = await getAuction((await params).id);
  if (!auction) notFound();

  const canControl = isAuctionOwner(auction, { id: user.id, isAdmin: isAdmin(user) });
  // If the auction is dedicated to a tournament, only that tournament's
  // teams are offered to the owner; otherwise every team is eligible.
  const eligibleTeams = auction.tournamentId
    ? await listTeamsForTournament(auction.tournamentId)
    : await listTeams();

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <AuctionRoom
        initial={auction}
        canControl={canControl}
        currentUserId={user.role === "guest" ? undefined : user.id}
        eligibleTeams={eligibleTeams.map((team) => ({ id: team.id, name: team.name }))}
      />
    </DashboardShell>
  );
}
