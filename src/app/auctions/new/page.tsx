import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { listTournaments } from "@/lib/tournaments";
import { DashboardShell } from "@/components/DashboardShell";
import { AuctionCreateForm } from "@/components/AuctionCreateForm";

export default async function NewAuctionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "guest") redirect("/register");
  const admin = isAdmin(user);
  const tournaments = (await listTournaments()).filter(
    (tournament) => admin || tournament.organizerId === user.id,
  );
  return (
    <DashboardShell userName={user.name} isAdmin={admin}>
      <Link href="/auctions" className="text-sm text-white/50 hover:text-white">
        ← Back to auctions
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Create cricket auction</h1>
      <p className="mt-1 mb-6 text-sm text-white/50">
        Teams and players register themselves (or are added by you) once the auction is created — you only need the basics here.
      </p>
      <AuctionCreateForm tournaments={tournaments.map((tournament) => ({ id: tournament.id, name: tournament.name }))} />
    </DashboardShell>
  );
}
