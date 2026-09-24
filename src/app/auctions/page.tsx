import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listAuctions } from "@/lib/auctions";
import { DashboardShell } from "@/components/DashboardShell";

export default async function AuctionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const auctions = await listAuctions();
  return <DashboardShell userName={user.name}><div className="mb-6 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">Cricket Auctions</h1><p className="mt-1 text-sm text-white/50">Run live player auctions with team purses and sold or unsold rounds.</p></div>{user.role !== "guest" && <Link href="/auctions/new" className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950">+ New auction</Link>}</div>{auctions.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/50">No auctions created yet.</div> : <div className="grid gap-3 sm:grid-cols-2">{auctions.map((auction) => <Link key={auction.id} href={`/auctions/${auction.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-400/40"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-white">{auction.name}</h2><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs capitalize text-white/70">{auction.status}</span></div><p className="mt-2 text-sm text-white/50">{auction.teams.length} teams · {auction.players.length} players · Round {auction.round}</p><p className="mt-3 text-xs text-white/40">Organized by {auction.ownerName}</p></Link>)}</div>}</DashboardShell>;
}
