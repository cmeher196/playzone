import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboardData, type PlayerAggregate } from "@/lib/stats";
import { battingPoints, bowlingPoints } from "@/lib/rating";
import { ensureDemoData } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { isAdmin } from "@/lib/admin";

type Row = { id: string; name: string; value: string | number; sub?: string };

function board(
  players: PlayerAggregate[],
  metric: (p: PlayerAggregate) => number,
  format: (p: PlayerAggregate) => string | number,
  sub?: (p: PlayerAggregate) => string,
  eligible?: (p: PlayerAggregate) => boolean,
): Row[] {
  return players
    .filter((p) => (eligible ? eligible(p) : true) && metric(p) > 0)
    .sort((a, b) => metric(b) - metric(a))
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, value: format(p), sub: sub?.(p) }));
}

export default async function RankingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureDemoData();

  const players = (await getLeaderboardData()).filter((p) => p.role !== "admin");

  const topRated = board(
    players,
    (p) => p.ppm,
    (p) => p.ppm,
    (p) => `${p.points} pts`,
    (p) => p.stats.matches > 0,
  );
  const bestBatter = board(
    players,
    (p) => battingPoints(p.stats),
    (p) => p.stats.runs,
    (p) => `${p.stats.runs} runs · SR ${p.stats.strikeRate ?? "—"}`,
  );
  const bestBowler = board(
    players,
    (p) => bowlingPoints(p.stats),
    (p) => p.stats.wickets,
    (p) => `${p.stats.wickets} wkts · Econ ${p.stats.economy ?? "—"}`,
  );
  const bestAllRounder = board(
    players,
    (p) => p.points,
    (p) => p.points,
    (p) => `${p.stats.runs} runs · ${p.stats.wickets} wkts`,
    (p) => p.stats.battingInnings > 0 && p.stats.bowlingInnings > 0,
  );
  const mostRuns = board(
    players,
    (p) => p.stats.runs,
    (p) => p.stats.runs,
    (p) => `${p.stats.battingInnings} inns`,
  );
  const mostWickets = board(
    players,
    (p) => p.stats.wickets,
    (p) => p.stats.wickets,
    (p) => `Best ${p.stats.bestBowling}`,
  );
  const mostSixes = board(
    players,
    (p) => p.stats.sixes,
    (p) => p.stats.sixes,
    (p) => `${p.stats.fours} fours`,
  );
  const mostFours = board(
    players,
    (p) => p.stats.fours,
    (p) => p.stats.fours,
    (p) => `${p.stats.sixes} sixes`,
  );
  const mostMaidens = board(
    players,
    (p) => p.stats.maidens,
    (p) => p.stats.maidens,
    (p) => `${p.stats.wickets} wkts`,
  );
  const bestEconomy: Row[] = players
    .filter((p) => p.stats.ballsBowled >= 12 && p.stats.economy != null)
    .sort((a, b) => a.stats.economy! - b.stats.economy!)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, value: p.stats.economy!, sub: `${p.stats.wickets} wkts` }));
  const bestStrikeRate: Row[] = players
    .filter((p) => p.stats.balls >= 20 && p.stats.strikeRate != null)
    .sort((a, b) => b.stats.strikeRate! - a.stats.strikeRate!)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, value: p.stats.strikeRate!, sub: `${p.stats.runs} runs` }));

  const champions = [
    { title: "Best Batter", emoji: "🏏", row: bestBatter[0] },
    { title: "Best Bowler", emoji: "🎯", row: bestBowler[0] },
    { title: "Best All-Rounder", emoji: "⭐", row: bestAllRounder[0] },
  ];

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">SMPL Rankings</h1>
        <p className="mt-1 text-sm text-white/50">
          Season leaderboards across every completed match.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {champions.map((c) => (
          <div
            key={c.title}
            className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-400/10 to-transparent p-5"
          >
            <div className="text-[11px] uppercase tracking-wide text-white/40">
              {c.title}
            </div>
            {c.row ? (
              <Link href={`/players/${c.row.id}`} className="mt-1 block">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="text-lg font-bold text-white transition hover:text-emerald-300">
                    {c.row.name}
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-amber-200">
                  {c.row.value} · {c.row.sub}
                </div>
              </Link>
            ) : (
              <div className="mt-2 text-sm text-white/40">No data yet</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Board title="⭐ Top Rated" unit="rating" rows={topRated} />
        <Board title="🏃 Most Runs" unit="runs" rows={mostRuns} />
        <Board title="🎯 Most Wickets" unit="wkts" rows={mostWickets} />
        <Board title="6️⃣ Most Sixes" unit="6s" rows={mostSixes} />
        <Board title="4️⃣ Most Fours" unit="4s" rows={mostFours} />
        <Board title="🧱 Most Maidens" unit="mdns" rows={mostMaidens} />
        <Board title="💹 Best Economy" unit="econ" rows={bestEconomy} />
        <Board title="⚡ Best Strike Rate" unit="SR" rows={bestStrikeRate} />
      </div>
    </DashboardShell>
  );
}

function Board({
  title,
  unit,
  rows,
}: {
  title: string;
  unit: string;
  rows: Row[];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-[11px] uppercase tracking-wide text-white/30">
          {unit}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-white/40">No data yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 text-sm">
              <span
                className={`w-4 text-center ${i === 0 ? "text-amber-300" : "text-white/30"}`}
              >
                {i + 1}
              </span>
              <Link
                href={`/players/${r.id}`}
                className="flex-1 truncate text-white transition hover:text-emerald-300"
              >
                {r.name}
              </Link>
              {r.sub && <span className="text-xs text-white/40">{r.sub}</span>}
              <span className="font-semibold text-emerald-300">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
