"use client";

import Link from "next/link";
import { useState } from "react";
import type { StandingRow, Fixture } from "@/lib/standings";
import { POINTS } from "@/lib/standings";

function nrrLabel(nrr: number): string {
  return nrr > 0 ? `+${nrr.toFixed(3)}` : nrr.toFixed(3);
}

export function TournamentStandings({
  standings,
  fixtures,
  tournamentId,
  canManage,
  qualify = 2,
}: {
  standings: StandingRow[];
  fixtures: Fixture[];
  tournamentId: string;
  canManage: boolean;
  qualify?: number;
}) {
  const anyPlayed = standings.some((r) => r.played > 0);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  return (
    <>
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Points table</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="w-full min-w-[460px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-white/40">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="py-2 pr-2 font-medium">Team</th>
                <th className="px-2 py-2 text-center font-medium">P</th>
                <th className="px-2 py-2 text-center font-medium">W</th>
                <th className="px-2 py-2 text-center font-medium">L</th>
                <th className="px-2 py-2 text-center font-medium">T</th>
                <th className="px-2 py-2 text-center font-medium">Pts</th>
                <th className="px-4 py-2 text-right font-medium">NRR</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <TeamStandingRows
                  key={row.teamId}
                  row={row}
                  index={i}
                  qualify={qualify}
                  anyPlayed={anyPlayed}
                  expanded={expandedTeam === row.teamId}
                  onToggle={() =>
                    setExpandedTeam((current) =>
                      current === row.teamId ? null : row.teamId,
                    )
                  }
                  matches={fixtures.filter(
                    (fixture) =>
                      fixture.match &&
                      (fixture.teamAId === row.teamId || fixture.teamBId === row.teamId),
                  )}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-white/40">
          Top {qualify} qualify · Win {POINTS.win} pts · Tie {POINTS.tie} pt ·
          NRR = run rate scored − run rate conceded.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Fixtures (round-robin)
        </h2>
        <ul className="space-y-2">
          {fixtures.map((f) => (
            <li
              key={`${f.teamAId}-${f.teamBId}`}
              className={`rounded-2xl border border-white/10 bg-white/[0.03] text-sm transition ${
                f.match ? "hover:border-emerald-400/40" : ""
              }`}
            >
              {f.match ? (
                <Link
                  href={`/matches/${f.match.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="text-white">
                    {f.teamAName} <span className="text-white/40">vs</span>{" "}
                    {f.teamBName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      f.match.status === "live"
                        ? "bg-rose-500/15 text-rose-300"
                        : f.match.status === "completed"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-white/10 text-white/60"
                    }`}
                  >
                    {f.match.status === "completed"
                      ? (f.match.result ?? "Result")
                      : f.match.status === "live"
                        ? "🔴 LIVE"
                        : "Scheduled"}
                  </span>
                </Link>
              ) : canManage ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-white">
                    {f.teamAName} <span className="text-white/40">vs</span>{" "}
                    {f.teamBName}
                  </span>
                  <Link
                    href={`/tournaments/${tournamentId}/matches/new`}
                    className="shrink-0 text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                  >
                    Schedule →
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-white">
                    {f.teamAName} <span className="text-white/40">vs</span>{" "}
                    {f.teamBName}
                  </span>
                  <span className="shrink-0 text-xs text-white/40">
                    Not scheduled
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function TeamStandingRows({
  row,
  index,
  qualify,
  anyPlayed,
  expanded,
  onToggle,
  matches,
}: {
  row: StandingRow;
  index: number;
  qualify: number;
  anyPlayed: boolean;
  expanded: boolean;
  onToggle: () => void;
  matches: Fixture[];
}) {
  return (
    <>
      <tr
        className={`border-t border-white/5 ${anyPlayed && index < qualify ? "bg-emerald-400/[0.06]" : ""}`}
      >
        <td className="px-4 py-2 text-white/40">{index + 1}</td>
        <td className="py-2 pr-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="font-medium text-white transition hover:text-emerald-300"
          >
            {row.name} <span className="ml-1 text-xs text-white/40">{expanded ? "⌃" : "⌄"}</span>
          </button>
          {anyPlayed && index < qualify && (
            <span className="ml-2 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              Q
            </span>
          )}
        </td>
        <td className="px-2 py-2 text-center text-white/70">{row.played}</td>
        <td className="px-2 py-2 text-center text-white/70">{row.won}</td>
        <td className="px-2 py-2 text-center text-white/70">{row.lost}</td>
        <td className="px-2 py-2 text-center text-white/70">{row.tied}</td>
        <td className="px-2 py-2 text-center font-semibold text-white">{row.points}</td>
        <td className="px-4 py-2 text-right text-white/70">{nrrLabel(row.nrr)}</td>
      </tr>
      {expanded && (
        <tr className="border-t border-white/5 bg-black/10">
          <td colSpan={8} className="px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Matches played
            </div>
            {matches.length === 0 ? (
              <p className="mt-2 text-sm text-white/40">No matches played yet.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {matches.map((fixture) => (
                  <Link
                    key={fixture.match!.id}
                    href={`/matches/${fixture.match!.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm transition hover:border-emerald-400/40"
                  >
                    <span className="text-white">
                      {fixture.teamAName} <span className="text-white/40">vs</span>{" "}
                      {fixture.teamBName}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-emerald-300">
                      {fixture.match!.status === "completed"
                        ? fixture.match!.result ?? "Scorecard"
                        : fixture.match!.status === "live"
                          ? "LIVE"
                          : "Scorecard"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
