import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listPlayers } from "@/lib/registrations";
import { listTeams } from "@/lib/teams";
import { DashboardShell } from "@/components/DashboardShell";
import { AuctionCreateForm } from "@/components/AuctionCreateForm";

export default async function NewAuctionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "guest") redirect("/register");
  const [players, teams] = await Promise.all([listPlayers(), listTeams()]);
  return <DashboardShell userName={user.name}><Link href="/auctions" className="text-sm text-white/50 hover:text-white">← Back to auctions</Link><h1 className="mt-2 text-2xl font-bold tracking-tight">Create cricket auction</h1><p className="mt-1 mb-6 text-sm text-white/50">Choose the registered teams and players who will enter the auction room.</p><AuctionCreateForm players={players.map((player) => ({ id: player.id, name: player.name, playerType: player.playerType }))} teams={teams.map((team) => ({ id: team.id, name: team.name }))} /></DashboardShell>;
}
