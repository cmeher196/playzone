import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAuction } from "@/lib/auctions";
import { isAdmin } from "@/lib/admin";
import { DashboardShell } from "@/components/DashboardShell";
import { AuctionRoom } from "@/components/AuctionRoom";

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const auction = await getAuction((await params).id);
  if (!auction) notFound();
  return <DashboardShell userName={user.name} isAdmin={isAdmin(user)}><AuctionRoom initial={auction} canControl={isAdmin(user) || auction.ownerId === user.id} /></DashboardShell>;
}
