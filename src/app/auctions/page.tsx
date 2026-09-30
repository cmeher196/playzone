import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { listAuctions, isAuctionOwner, type Auction } from "@/lib/auctions";
import { DashboardShell } from "@/components/DashboardShell";

function statusBadge(auction: Auction): { label: string; className: string } {
  if (auction.status === "live") {
    return { label: "LIVE", className: "bg-emerald-400/15 text-emerald-300" };
  }
  if (auction.status === "completed") {
    return { label: "COMPLETED", className: "bg-white/10 text-white/60" };
  }
  // "setup" — distinguish an unscheduled draft from one with a date set.
  return auction.date
    ? { label: "UPCOMING", className: "bg-sky-400/15 text-sky-300" }
    : { label: "DRAFT", className: "bg-amber-400/15 text-amber-300" };
}

function fmtWhen(auction: Auction): string | null {
  if (!auction.date) return null;
  const date = new Date(`${auction.date}T${auction.time || "00:00"}`);
  const dateLabel = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeLabel = auction.time
    ? date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : null;
  return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
}

export default async function AuctionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const admin = isAdmin(user);
  const auctions = await listAuctions();

  return (
    <DashboardShell userName={user.name} isAdmin={admin}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cricket Auctions</h1>
          <p className="mt-1 text-sm text-white/50">
            Run live player auctions with team purses and sold or unsold rounds.
          </p>
        </div>
        {user.role !== "guest" && (
          <Link
            href="/auctions/new"
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
          >
            + Create Auction
          </Link>
        )}
      </div>

      {auctions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/50">
          No auctions created yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {auctions.map((auction) => {
            const badge = statusBadge(auction);
            const when = fmtWhen(auction);
            const canControl = isAuctionOwner(auction, { id: user.id, isAdmin: admin });
            return (
              <div key={auction.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-white">🔨 {auction.name}</h2>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/50">
                  {auction.teams.length} teams · {auction.players.length} players
                  {when ? ` · ${when}` : ""}
                </p>
                <p className="mt-1 text-xs text-white/40">Organized by {auction.ownerName}</p>
                <div className="mt-4 flex gap-2">
                  {canControl && (
                    <Link
                      href={`/auctions/${auction.id}`}
                      className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
                    >
                      Manage
                    </Link>
                  )}
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
                  >
                    {auction.status === "live" ? "Enter Auction" : auction.status === "completed" ? "View Results" : canControl ? "Setup" : "View"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
