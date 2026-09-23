import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboardData } from "@/lib/stats";
import { ratingTier } from "@/lib/rating";
import { ensureDemoData } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { isAdmin } from "@/lib/admin";

const ROLE_ICONS: Record<string, string> = {
  Batsman: "🏏",
  Bowler: "🎯",
  "All-Rounder": "⭐",
  "Wicket-Keeper": "🧤",
};

export default async function PlayersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureDemoData();

  const players = (await getLeaderboardData())
    .filter((p) => p.role !== "admin")
    .sort((a, b) => b.points - a.points);

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <Link href="/rankings" className="text-sm text-white/50 transition hover:text-white/80">
        ← Rankings
      </Link>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Players</h1>
        <p className="mt-1 text-sm text-white/50">
          {players.length} registered players · tap anyone to view their profile
          &amp; stats
        </p>
      </div>

      {players.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
          No players yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {players.map((p, i) => {
            const tier = ratingTier(p.ppm);
            return (
              <li key={p.id}>
                <Link
                  href={`/players/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-emerald-400/40"
                >
                  <span className="w-5 text-center text-sm text-white/30">
                    {i + 1}
                  </span>
                  <span className="text-xl" aria-hidden>
                    {ROLE_ICONS[p.playerType] ?? "🏏"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="truncate text-xs text-white/50">
                      {p.playerType} · {p.stats.matches} matches · {p.stats.runs}{" "}
                      runs · {p.stats.wickets} wkts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-300">{p.points}</div>
                    <div className="text-[11px] text-amber-300">
                      {tier.label}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
