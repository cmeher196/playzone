import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listTournamentsForPlayer } from "@/lib/tournaments";
import { ensureDemoData } from "@/lib/demo-data";
import { getPlayerPerformance } from "@/lib/stats";
import { computePoints, pointsPerMatch } from "@/lib/rating";
import { DashboardShell } from "@/components/DashboardShell";
import {
  PlayerRatingCard,
  StatOverview,
  PerformancePanels,
} from "@/components/PlayerStats";
import { isAdmin } from "@/lib/admin";
import { formatMatchDate } from "@/lib/format";

export default async function PerformancePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureDemoData();

  const tournaments = await listTournamentsForPlayer(user.id);
  const { stats, recent } = await getPlayerPerformance(user.id);
  const points = computePoints(stats);
  const ppm = pointsPerMatch(points, stats.matches);

  const overview = [
    { label: "Matches", value: stats.matches },
    { label: "Runs", value: stats.runs },
    { label: "Wickets", value: stats.wickets },
    { label: "Catches", value: stats.catches },
    { label: "High score", value: stats.highScore },
    { label: "Points", value: points },
  ];

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">My Performance</h1>
        <p className="mt-1 text-sm text-white/50">
          {user.name} · {user.playerType}
        </p>
      </div>

      <div className="mb-4">
        <PlayerRatingCard points={points} ppm={ppm} matches={stats.matches} />
      </div>

      <StatOverview items={overview} />

      {stats.matches === 0 && (
        <p className="mt-3 text-xs text-white/40">
          No match records yet. Your batting, bowling &amp; fielding stats appear
          here once you feature in a completed match.
        </p>
      )}

      <h2 className="mt-6 mb-3 text-lg font-semibold text-white">Career stats</h2>
      <PerformancePanels stats={stats} />

      {recent.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-semibold text-white">
            Recent matches
          </h2>
          <ul className="space-y-2">
            {recent.map((m) => (
              <li
                key={m.matchId}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/tournaments/${m.tournamentId}`}
                    className="font-medium text-white hover:text-emerald-300"
                  >
                    {m.teamA} vs {m.teamB}
                  </Link>
                  <span className="text-xs text-white/40">
                    {formatMatchDate(m.date)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-white/60">
                  {m.batting && (
                    <span>
                      🏏 {m.batting.runs} ({m.batting.balls})
                      {m.batting.how === "not out" ? "*" : ""}
                    </span>
                  )}
                  {m.bowling && (
                    <span>
                      🎯 {m.bowling.wickets}/{m.bowling.runs} ({m.bowling.overs})
                    </span>
                  )}
                  {m.result && (
                    <span className="text-emerald-300/80">{m.result}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold text-white">
        My tournaments
      </h2>
      {tournaments.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
          You haven&apos;t joined any tournaments yet.{" "}
          <Link href="/tournaments" className="text-emerald-300 hover:text-emerald-200">
            Browse tournaments
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-emerald-400/40"
              >
                <div>
                  <div className="font-medium text-white">{t.name}</div>
                  <div className="text-xs text-white/50">
                    {formatMatchDate(t.matchDates[0])}
                    {t.matchDates.length > 1 && ` +${t.matchDates.length - 1} more`}
                  </div>
                </div>
                <span className="text-white/30">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
