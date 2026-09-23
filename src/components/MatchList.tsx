"use client";

import { useState } from "react";
import Link from "next/link";
import type { Match, Innings } from "@/lib/tournaments";
import { formatMatchDate } from "@/lib/format";

function strikeRate(runs: number, balls: number): string {
  if (!balls) return "—";
  return ((runs / balls) * 100).toFixed(1);
}

function economy(runs: number, overs: number): string {
  const whole = Math.floor(overs);
  const balls = whole * 6 + Math.round((overs - whole) * 10);
  if (!balls) return "—";
  return (runs / (balls / 6)).toFixed(1);
}

export function MatchList({
  matches,
  currentPlayerId,
}: {
  matches: Match[];
  currentPlayerId?: string;
}) {
  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">
        No matches yet.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} currentPlayerId={currentPlayerId} />
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: Match["status"] }) {
  const map = {
    completed: "border-white/15 bg-white/5 text-white/60",
    scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    live: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${map[status]}`}
    >
      {status}
    </span>
  );
}

function MatchCard({
  match,
  currentPlayerId,
}: {
  match: Match;
  currentPlayerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const completed = match.status === "completed";
  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span>{formatMatchDate(match.date)}</span>
            <StatusBadge status={match.status} />
          </div>
          <div className="mt-1 font-semibold text-white">
            {match.teamA} <span className="text-white/40">vs</span> {match.teamB}
          </div>
          {completed && (
            <div className="mt-1 space-y-0.5 text-sm text-white/70">
              {match.innings.map((inn, i) => (
                <div key={i}>
                  {inn.team}:{" "}
                  <span className="font-medium text-white">
                    {inn.runs}/{inn.wickets}
                  </span>{" "}
                  <span className="text-white/40">({inn.overs} ov)</span>
                </div>
              ))}
            </div>
          )}
          {match.result && (
            <div className="mt-1 text-sm font-medium text-emerald-300">
              {match.result}
            </div>
          )}
        </div>
        {completed && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {match.id.startsWith("LM-") && (
              <Link
                href={`/matches/${match.id}`}
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/20"
              >
                Live · Overs · Commentary →
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10"
            >
              {open ? "Hide scorecard" : "View scorecard"}
            </button>
          </div>
        )}
      </div>

      {open && completed && (
        <div className="space-y-6 border-t border-white/10 bg-black/20 p-4">
          {match.playerOfTheMatch && (
            <div className="text-sm">
              <span className="text-white/40">Player of the match: </span>
              <span className="font-medium text-amber-300">
                ⭐ {match.playerOfTheMatch}
              </span>
            </div>
          )}
          {match.innings.map((inn, i) => (
            <InningsCard
              key={i}
              innings={inn}
              currentPlayerId={currentPlayerId}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function InningsCard({
  innings,
  currentPlayerId,
}: {
  innings: Innings;
  currentPlayerId?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold text-white">{innings.team}</h4>
        <span className="text-sm text-white/60">
          {innings.runs}/{innings.wickets} ({innings.overs} ov)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-white/40">
              <th className="py-1 pr-2 font-medium">Batter</th>
              <th className="py-1 pr-2 font-medium" />
              <th className="px-2 py-1 text-right font-medium">R</th>
              <th className="px-2 py-1 text-right font-medium">B</th>
              <th className="px-2 py-1 text-right font-medium">4s</th>
              <th className="px-2 py-1 text-right font-medium">6s</th>
              <th className="py-1 pl-2 text-right font-medium">SR</th>
            </tr>
          </thead>
          <tbody>
            {innings.batting.map((b, i) => {
              const mine = b.playerId && b.playerId === currentPlayerId;
              return (
                <tr
                  key={i}
                  className={`border-t border-white/5 ${mine ? "text-emerald-300" : "text-white/80"}`}
                >
                  <td className="py-1 pr-2 font-medium">{b.name}</td>
                  <td className="py-1 pr-2 text-xs text-white/40">{b.how}</td>
                  <td className="px-2 py-1 text-right font-semibold">{b.runs}</td>
                  <td className="px-2 py-1 text-right">{b.balls}</td>
                  <td className="px-2 py-1 text-right">{b.fours}</td>
                  <td className="px-2 py-1 text-right">{b.sixes}</td>
                  <td className="py-1 pl-2 text-right text-white/50">
                    {strikeRate(b.runs, b.balls)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[440px] text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-white/40">
              <th className="py-1 pr-2 font-medium">Bowler</th>
              <th className="px-2 py-1 text-right font-medium">O</th>
              <th className="px-2 py-1 text-right font-medium">M</th>
              <th className="px-2 py-1 text-right font-medium">R</th>
              <th className="px-2 py-1 text-right font-medium">W</th>
              <th className="py-1 pl-2 text-right font-medium">Econ</th>
            </tr>
          </thead>
          <tbody>
            {innings.bowling.map((b, i) => {
              const mine = b.playerId && b.playerId === currentPlayerId;
              return (
                <tr
                  key={i}
                  className={`border-t border-white/5 ${mine ? "text-emerald-300" : "text-white/80"}`}
                >
                  <td className="py-1 pr-2 font-medium">{b.name}</td>
                  <td className="px-2 py-1 text-right">{b.overs}</td>
                  <td className="px-2 py-1 text-right">{b.maidens}</td>
                  <td className="px-2 py-1 text-right">{b.runs}</td>
                  <td className="px-2 py-1 text-right font-semibold">
                    {b.wickets}
                  </td>
                  <td className="py-1 pl-2 text-right text-white/50">
                    {economy(b.runs, b.overs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {innings.fielding && innings.fielding.length > 0 && (
        <div className="mt-2 text-xs text-white/50">
          Fielding:{" "}
          {innings.fielding
            .map((f) => {
              const bits: string[] = [];
              if (f.catches) bits.push(`${f.catches}c`);
              if (f.stumpings) bits.push(`${f.stumpings}st`);
              if (f.runOuts) bits.push(`${f.runOuts} run out`);
              return `${f.name} (${bits.join(", ")})`;
            })
            .join(" · ")}
        </div>
      )}
    </div>
  );
}
