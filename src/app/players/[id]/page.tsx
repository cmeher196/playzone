import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { findById, toPublic } from "@/lib/registrations";
import { getPlayerPerformance } from "@/lib/stats";
import { computePoints, pointsPerMatch } from "@/lib/rating";
import { isAdmin } from "@/lib/admin";
import { ensureDemoData } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import {
  PlayerRatingCard,
  StatOverview,
  PerformancePanels,
} from "@/components/PlayerStats";
import { formatMatchDate } from "@/lib/format";

const ROLE_ICONS: Record<string, string> = {
  Batsman: "🏏",
  Bowler: "🎯",
  "All-Rounder": "⭐",
  "Wicket-Keeper": "🧤",
};

function maskMobile(m: string): string {
  return m.length === 10 ? `+91 ${m.slice(0, 2)}••••${m.slice(-2)}` : "+91 ••••••••••";
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  await ensureDemoData();

  const { id } = await params;
  const record = await findById(id);
  if (!record) notFound();
  const player = toPublic(record);

  const { stats, recent } = await getPlayerPerformance(id);
  const points = computePoints(stats);
  const ppm = pointsPerMatch(points, stats.matches);

  const isOwner = viewer.id === id;
  const viewerIsAdmin = isAdmin(viewer);
  const canSeeMobile = isOwner || viewerIsAdmin;
  const photo = player.photos?.[0];

  const overview = [
    { label: "Matches", value: stats.matches },
    { label: "Runs", value: stats.runs },
    { label: "High score", value: stats.highScore },
    { label: "Wickets", value: stats.wickets },
    { label: "Catches", value: stats.catches },
    { label: "Points", value: points },
  ];

  return (
    <DashboardShell userName={viewer.name} isAdmin={viewerIsAdmin}>
      <Link
        href="/players"
        className="text-sm text-white/50 transition hover:text-white/80"
      >
        ← All players
      </Link>

      <div className="mt-2 mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={player.name}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl">
              {ROLE_ICONS[player.playerType] ?? "🏏"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/50">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                {player.playerType}
              </span>
              <span>
                {player.gender} · {player.age} yrs
              </span>
              <span className="font-mono text-emerald-300/70">{player.id}</span>
            </div>
            <div className="mt-1 text-sm text-white/50">
              📱 {canSeeMobile ? `+91 ${player.mobile}` : maskMobile(player.mobile)}
            </div>
          </div>
        </div>
        <div>
          {isOwner ? (
            <Link
              href="/profile"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
            >
              ✏️ Edit my profile
            </Link>
          ) : viewerIsAdmin ? (
            <Link
              href="/admin"
              className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-400/20"
            >
              🛡️ Edit in Admin
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mb-4">
        <PlayerRatingCard points={points} ppm={ppm} matches={stats.matches} />
      </div>

      <StatOverview items={overview} />

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
                className="rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-emerald-400/40"
              >
                <Link
                  href={
                    m.matchId.startsWith("LM-")
                      ? `/matches/${m.matchId}`
                      : `/tournaments/${m.tournamentId}`
                  }
                  className="block px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white hover:text-emerald-300">
                    {m.teamA} vs {m.teamB}
                    </span>
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
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardShell>
  );
}
