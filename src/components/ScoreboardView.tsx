"use client";

import { useState } from "react";
import type {
  LiveMatch,
  ComputedMatch,
  InningsState,
  CommentaryEntry,
  TeamRef,
} from "@/lib/live-scoring";

export interface ScoreboardData {
  match: LiveMatch;
  live: ComputedMatch;
}

function sr(runs: number, balls: number): string {
  return balls > 0 ? ((runs / balls) * 100).toFixed(1) : "—";
}
function econ(runs: number, balls: number): string {
  return balls > 0 ? (runs / (balls / 6)).toFixed(1) : "—";
}
function ov(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function chipClass(label: string): string {
  const base =
    "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ";
  if (label === "W") return base + "bg-rose-500/20 text-rose-300";
  if (label === "6") return base + "bg-amber-400/20 text-amber-300";
  if (label === "4") return base + "bg-sky-400/20 text-sky-300";
  if (label.includes("wd") || label.includes("nb"))
    return base + "bg-amber-500/10 text-amber-200/80";
  if (label.includes("lb") || label.includes("b"))
    return base + "bg-white/10 text-white/60";
  if (label === "0") return base + "bg-white/5 text-white/50";
  return base + "bg-white/10 text-white/80";
}

type Tab = "live" | "scorecard" | "squads" | "overs" | "progress" | "commentary" | "info";

const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "scorecard", label: "Scorecard" },
  { id: "squads", label: "Squads" },
  { id: "overs", label: "Overs" },
  { id: "progress", label: "Progress" },
  { id: "commentary", label: "Commentary" },
  { id: "info", label: "Info" },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toUTCString().replace(" GMT", "");
}

export function ScoreboardView({ data }: { data: ScoreboardData }) {
  const { match, live } = data;
  const cur = live.innings[live.currentInnings] as InningsState | undefined;
  const first = live.innings[0] as InningsState | undefined;
  const second = live.innings[1] as InningsState | undefined;
  const [tab, setTab] = useState<Tab>("live");

  if (!cur) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
        Match not started yet.
      </div>
    );
  }

  const completed = match.status === "completed";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              {match.status === "live" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300">
                  🔴 LIVE
                </span>
              )}
              <span>{cur.battingTeam.name}</span>
              {!completed && cur.freeHit && (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                  ⚡ FREE HIT
                </span>
              )}
            </div>
            <div className="mt-1 text-3xl font-bold text-white">
              {cur.runs}/{cur.wickets}{" "}
              <span className="text-lg font-medium text-white/50">
                ({cur.oversText}/{match.overs})
              </span>
            </div>
            {second && first && (
              <div className="mt-1 text-sm text-white/50">
                {first.battingTeam.name} {first.runs}/{first.wickets} (
                {first.oversText})
              </div>
            )}
          </div>
          <div className="text-right text-sm text-white/70">
            {live.currentInnings === 0 ? (
              <div>CRR {live.crr ?? "—"}</div>
            ) : (
              <>
                <div className="font-semibold text-amber-300">
                  Target {live.target}
                </div>
                <div>
                  Need {live.runsToWin} off {live.ballsRemaining}
                </div>
                <div className="text-white/50">
                  CRR {live.crr ?? "—"} · RRR {live.rrr ?? "—"}
                </div>
              </>
            )}
          </div>
        </div>

        {completed && live.result && (
          <div className="mt-3 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300">
            🏆 {live.result}
            {match.playerOfTheMatch && ` · POTM: ${match.playerOfTheMatch}`}
          </div>
        )}

        {!completed && cur.thisOver.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] uppercase tracking-wide text-white/40">
              This over
            </span>
            {cur.thisOver.map((b, i) => (
              <span key={i} className={chipClass(b)}>
                {b}
              </span>
            ))}
            <span className="ml-1 text-sm text-white/50">
              · {cur.thisOverRuns} run{cur.thisOverRuns === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              "whitespace-nowrap px-3 py-2 text-sm font-medium transition " +
              (tab === t.id
                ? "border-b-2 border-emerald-400 text-white"
                : "text-white/50 hover:text-white/80")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "live" && <LivePanel match={match} cur={cur} />}
      {tab === "scorecard" && <ScorecardPanel first={first} second={second} />}
      {tab === "squads" && (
        <SquadsPanel teamA={match.teamA} teamB={match.teamB} />
      )}
      {tab === "overs" && <OversPanel first={first} second={second} />}
      {tab === "progress" && (
        <ProgressPanel match={match} live={live} first={first} second={second} />
      )}
      {tab === "commentary" && (
        <CommentaryPanel
          first={first}
          second={second}
          current={live.currentInnings}
        />
      )}
      {tab === "info" && <InfoPanel match={match} live={live} />}
    </div>
  );
}

function LivePanel({ match, cur }: { match: LiveMatch; cur: InningsState }) {
  const completed = match.status === "completed";
  const striker = cur.batters.find((b) => b.playerId === cur.strikerId);
  const nonStriker = cur.batters.find((b) => b.playerId === cur.nonStrikerId);
  const bowler = cur.bowlers.find((b) => b.playerId === cur.bowlerId);
  return (
    <div className="space-y-4">
      {!completed && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-white/40">
              Batting
            </div>
            {striker ? (
              <div className="text-white">
                {striker.name}
                <span className="text-emerald-300">*</span> {striker.runs} (
                {striker.balls})
              </div>
            ) : (
              <div className="text-white/40">—</div>
            )}
            {nonStriker && (
              <div className="text-white/70">
                {nonStriker.name} {nonStriker.runs} ({nonStriker.balls})
              </div>
            )}
            {cur.partnership.balls > 0 && (
              <div className="mt-1 text-xs text-white/50">
                P&apos;ship {cur.partnership.runs} ({cur.partnership.balls})
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-white/40">
              Bowling
            </div>
            {bowler ? (
              <div className="text-white">
                {bowler.name} {ov(bowler.legalBalls)}-{bowler.maidens}-
                {bowler.runs}-{bowler.wickets}
              </div>
            ) : (
              <div className="text-white/40">—</div>
            )}
          </div>
        </div>
      )}

      {cur.commentary.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="mb-3 text-sm font-semibold text-white">
            Recent commentary
          </h4>
          <CommentaryList entries={[...cur.commentary].slice(-6).reverse()} />
        </div>
      )}
    </div>
  );
}

function ScorecardPanel({
  first,
  second,
}: {
  first?: InningsState;
  second?: InningsState;
}) {
  return (
    <div className="space-y-5">
      {first && <InningsBlock innings={first} />}
      {second && <InningsBlock innings={second} />}
    </div>
  );
}

function InningsBlock({ innings }: { innings: InningsState }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="font-semibold text-white">
          {innings.battingTeam.name}
        </span>
        <span className="text-lg font-bold text-white">
          {innings.runs}/{innings.wickets}{" "}
          <span className="text-sm font-medium text-white/50">
            ({innings.oversText})
          </span>
        </span>
      </div>
      <InningsTables innings={innings} />
    </div>
  );
}

function SquadsPanel({ teamA, teamB }: { teamA: TeamRef; teamB: TeamRef }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[teamA, teamB].map((team) => (
        <div
          key={team.teamId}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <h4 className="mb-3 text-sm font-semibold text-white">{team.name}</h4>
          {team.players.length === 0 ? (
            <p className="text-sm text-white/40">No players listed.</p>
          ) : (
            <ol className="space-y-1.5 text-sm text-white/80">
              {team.players.map((p, i) => (
                <li key={p.playerId} className="flex gap-2">
                  <span className="w-5 shrink-0 text-white/30">{i + 1}.</span>
                  {p.name}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}

function OversList({ innings }: { innings: InningsState }) {
  if (innings.overs.length === 0) {
    return <p className="text-sm text-white/40">No overs bowled yet.</p>;
  }
  return (
    <div className="space-y-2">
      {[...innings.overs].reverse().map((o) => (
        <div
          key={o.over}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white">Over {o.over + 1}</span>
            <span className="text-white/50">{o.bowlerName}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {o.balls.map((b, i) => (
              <span key={i} className={chipClass(b)}>
                {b}
              </span>
            ))}
            <span className="ml-1 text-sm text-white/60">
              {o.runs} run{o.runs === 1 ? "" : "s"}
              {o.wickets > 0 ? ` · ${o.wickets} wkt` : ""}
            </span>
            <span className="ml-auto text-sm font-semibold text-white/80">
              {o.score}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OversPanel({
  first,
  second,
}: {
  first?: InningsState;
  second?: InningsState;
}) {
  const innings = second ?? first;
  if (!innings) {
    return <p className="text-sm text-white/40">No overs bowled yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-semibold text-white">
          {innings.battingTeam.name} — {innings.runs}/{innings.wickets}
        </h4>
        <OversList innings={innings} />
      </div>
      {second && first && (
        <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <summary className="cursor-pointer text-sm font-medium text-white/70">
            1st innings overs — {first.battingTeam.name}
          </summary>
          <div className="mt-3">
            <OversList innings={first} />
          </div>
        </details>
      )}
    </div>
  );
}

function CommentaryPanel({
  first,
  second,
  current,
}: {
  first?: InningsState;
  second?: InningsState;
  current: number;
}) {
  const innings = current === 1 ? (second ?? first) : first;
  if (!innings || innings.commentary.length === 0) {
    return <p className="text-sm text-white/40">No commentary yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="mb-3 text-sm font-semibold text-white">
          {innings.battingTeam.name} innings
        </h4>
        <CommentaryList entries={[...innings.commentary].reverse()} />
      </div>
      {current === 1 && first && (
        <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <summary className="cursor-pointer text-sm font-medium text-white/70">
            1st innings commentary — {first.battingTeam.name}
          </summary>
          <div className="mt-3">
            <CommentaryList entries={[...first.commentary].reverse()} />
          </div>
        </details>
      )}
    </div>
  );
}

function CommentaryList({ entries }: { entries: CommentaryEntry[] }) {
  return (
    <ul className="space-y-3">
      {entries.map((c, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="w-10 shrink-0 pt-0.5 text-xs text-white/40">
            {c.over}
          </span>
          <span className={chipClass(c.label)}>{c.label}</span>
          <span className="text-white/80">{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

type WormPoint = { x: number; runs: number; wicketsThisOver: number };

/** Cumulative runs after each over; x is overs completed (fractional for a part-over). */
function wormPoints(innings: InningsState | undefined): WormPoint[] {
  if (!innings || innings.overs.length === 0) return [];
  const pts: WormPoint[] = [{ x: 0, runs: 0, wicketsThisOver: 0 }];
  const last = innings.overs.length - 1;
  let runs = 0;
  innings.overs.forEach((o, i) => {
    runs += o.runs;
    pts.push({
      x: i === last ? innings.legalBalls / 6 : o.over + 1,
      runs,
      wicketsThisOver: o.wickets,
    });
  });
  return pts;
}

function niceCeil(v: number): number {
  if (v <= 10) return 10;
  const step = v <= 50 ? 10 : v <= 120 ? 20 : v <= 300 ? 50 : 100;
  return Math.ceil(v / step) * step;
}

const WORM_A = "#38bdf8";
const WORM_B = "#fb923c";

function ProgressPanel({
  match,
  live,
  first,
  second,
}: {
  match: LiveMatch;
  live: ComputedMatch;
  first?: InningsState;
  second?: InningsState;
}) {
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);

  const aPts = wormPoints(first);
  const bPts = wormPoints(second);

  if (aPts.length === 0 && bPts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
        The run worm appears once the first over is bowled.
      </div>
    );
  }

  // Chart geometry (fixed viewBox, scales responsively).
  const W = 640;
  const H = 320;
  const padL = 46;
  const padR = 18;
  const padT = 18;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const lastX = (p: WormPoint[]) => (p.length ? p[p.length - 1].x : 0);
  const maxOvers = Math.max(match.overs || 0, lastX(aPts), lastX(bPts), 1);
  const maxRuns = niceCeil(Math.max(first?.runs ?? 0, second?.runs ?? 0, 1));

  const X = (overs: number) => padL + (overs / maxOvers) * plotW;
  const Y = (runs: number) => padT + plotH - (runs / maxRuns) * plotH;
  const line = (pts: WormPoint[]) =>
    pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.runs).toFixed(1)}`).join(" ");

  const runStep = maxRuns <= 10 ? 2 : maxRuns / 5;
  const yTicks: number[] = [];
  for (let r = 0; r <= maxRuns + 0.001; r += runStep) yTicks.push(Math.round(r));

  const overStep = maxOvers <= 6 ? 1 : maxOvers <= 12 ? 2 : maxOvers <= 25 ? 5 : 10;
  const xTicks: number[] = [];
  for (let o = 0; o <= maxOvers + 0.001; o += overStep) xTicks.push(Math.round(o));

  const series = [
    { pts: aPts, color: WORM_A, show: showA, innings: first },
    { pts: bPts, color: WORM_B, show: showB, innings: second },
  ];

  const chase =
    live.runsToWin !== undefined &&
    live.ballsRemaining !== undefined &&
    second &&
    !live.result
      ? `${second.battingTeam.name} need ${live.runsToWin} more to win from ${live.ballsRemaining} ball${live.ballsRemaining === 1 ? "" : "s"}${live.rrr !== null ? ` at ${live.rrr.toFixed(2)} RPO` : ""}`
      : live.result
        ? live.result
        : first
          ? `${first.battingTeam.name} ${first.runs}/${first.wickets} (${first.oversText})${live.crr !== null ? ` · ${live.crr.toFixed(2)} RPO` : ""}`
          : "";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Scoring comparison
          </h3>
          <div className="flex gap-2">
            {first && (
              <button
                type="button"
                onClick={() => setShowA((v) => !v)}
                aria-pressed={showA}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                style={{
                  backgroundColor: showA ? WORM_A : "transparent",
                  color: showA ? "#052f4a" : "rgba(255,255,255,0.55)",
                  border: `1px solid ${showA ? WORM_A : "rgba(255,255,255,0.15)"}`,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: showA ? "#052f4a" : WORM_A }} />
                {first.battingTeam.name}
              </button>
            )}
            {second && (
              <button
                type="button"
                onClick={() => setShowB((v) => !v)}
                aria-pressed={showB}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                style={{
                  backgroundColor: showB ? WORM_B : "transparent",
                  color: showB ? "#432004" : "rgba(255,255,255,0.55)",
                  border: `1px solid ${showB ? WORM_B : "rgba(255,255,255,0.15)"}`,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: showB ? "#432004" : WORM_B }} />
                {second.battingTeam.name}
              </button>
            )}
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Run worm comparison">
          {yTicks.map((r) => (
            <g key={`y${r}`}>
              <line x1={padL} y1={Y(r)} x2={W - padR} y2={Y(r)} className="stroke-white/10" strokeWidth={1} />
              <text x={padL - 8} y={Y(r) + 4} textAnchor="end" fontSize={11} className="fill-white/50">
                {r}
              </text>
            </g>
          ))}

          {xTicks.map((o) => (
            <text
              key={`x${o}`}
              x={X(o)}
              y={H - padB + 18}
              textAnchor="middle"
              fontSize={11}
              className="fill-white/50"
            >
              {o}
            </text>
          ))}

          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} className="stroke-white/25" strokeWidth={1} />
          <line
            x1={padL}
            y1={padT + plotH}
            x2={W - padR}
            y2={padT + plotH}
            className="stroke-white/25"
            strokeWidth={1}
          />

          {/* Target line when chasing */}
          {live.target !== undefined && live.target - 1 <= maxRuns && second && (
            <g>
              <line
                x1={padL}
                y1={Y(live.target - 1)}
                x2={W - padR}
                y2={Y(live.target - 1)}
                stroke="rgba(52,211,153,0.5)"
                strokeWidth={1}
                strokeDasharray="5 4"
              />
              <text x={W - padR} y={Y(live.target - 1) - 5} textAnchor="end" fontSize={10} fill="rgba(52,211,153,0.9)">
                Target {live.target}
              </text>
            </g>
          )}

          <text x={14} y={padT + plotH / 2} fontSize={10} className="fill-white/45" textAnchor="middle" transform={`rotate(-90 14 ${padT + plotH / 2})`}>
            RUNS
          </text>
          <text x={padL + plotW / 2} y={H - 4} fontSize={10} className="fill-white/45" textAnchor="middle">
            OVERS
          </text>

          {series.map(({ pts, color, show }, idx) =>
            show && pts.length > 1 ? (
              <polyline
                key={idx}
                points={line(pts)}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null,
          )}

          {series.map(({ pts, color, show }, idx) =>
            show
              ? pts
                  .filter((p) => p.wicketsThisOver > 0)
                  .map((p, i) => (
                    <circle
                      key={`${idx}-w${i}`}
                      cx={X(p.x)}
                      cy={Y(p.runs)}
                      r={4.5}
                      fill={color}
                      className="stroke-[var(--page-bg)]"
                      strokeWidth={1.5}
                    />
                  ))
              : null,
          )}
        </svg>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-white/45">
          <span className="inline-flex h-2.5 w-2.5 rounded-full border border-white/40 bg-white/20" />
          Dots mark overs where a wicket fell
        </div>
      </div>

      {chase && (
        <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm font-semibold text-white">
          {chase}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {series.map(({ innings, color }, idx) =>
          innings ? (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-sm font-semibold text-white">{innings.battingTeam.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/5 px-2 py-2">
                  <div className="text-lg font-bold tabular-nums text-white">
                    {innings.runs}/{innings.wickets}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-white/45">Score</div>
                </div>
                <div className="rounded-lg bg-white/5 px-2 py-2">
                  <div className="text-lg font-bold tabular-nums text-white">{innings.oversText}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/45">Overs</div>
                </div>
                <div className="rounded-lg bg-white/5 px-2 py-2">
                  <div className="text-lg font-bold tabular-nums text-white">
                    {econ(innings.runs, innings.legalBalls)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-white/45">RPO</div>
                </div>
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

function InfoPanel({ match, live }: { match: LiveMatch; live: ComputedMatch }) {
  const tossWinner =
    match.toss.winnerTeamId === match.teamA.teamId
      ? match.teamA.name
      : match.teamB.name;
  const statusLabel =
    match.status === "completed"
      ? "Completed"
      : match.status === "live"
        ? "Live"
        : "Scheduled";
  const rows: [string, string][] = [
    ["Match", `${match.teamA.name} vs ${match.teamB.name}`],
    ["Format", `${match.overs} overs a side`],
    ["Toss", `${tossWinner} won the toss and chose to ${match.toss.decision}`],
    ["Venue", match.venue || "—"],
    ["Date & Time", fmtDate(match.date)],
    ["Status", statusLabel],
  ];
  if (live.result) rows.push(["Result", live.result]);
  if (match.playerOfTheMatch)
    rows.push(["Player of the Match", match.playerOfTheMatch]);
  return (
    <dl className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-wrap gap-2 py-2">
          <dt className="w-40 shrink-0 text-white/40">{k}</dt>
          <dd className="text-white/85">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function InningsTables({ innings }: { innings: InningsState }) {
  const batted = innings.batters.filter((b) => b.balls > 0 || b.out);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <table className="w-full min-w-[420px] text-left text-sm">
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
            {batted.map((b) => (
              <tr key={b.playerId} className="border-t border-white/5 text-white/80">
                <td className="py-1 pr-2 font-medium text-white">{b.name}</td>
                <td className="py-1 pr-2 text-xs text-white/40">
                  {b.out ? b.how : "not out"}
                </td>
                <td className="px-2 py-1 text-right font-semibold">{b.runs}</td>
                <td className="px-2 py-1 text-right">{b.balls}</td>
                <td className="px-2 py-1 text-right">{b.fours}</td>
                <td className="px-2 py-1 text-right">{b.sixes}</td>
                <td className="py-1 pl-2 text-right text-white/50">
                  {sr(b.runs, b.balls)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-xs text-white/50">
          Extras {innings.extras.total} (wd {innings.extras.wides}, nb{" "}
          {innings.extras.noBalls}, b {innings.extras.byes}, lb{" "}
          {innings.extras.legByes})
        </div>
      </div>

      {innings.bowlers.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <table className="w-full min-w-[420px] text-left text-sm">
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
              {innings.bowlers.map((b) => (
                <tr key={b.playerId} className="border-t border-white/5 text-white/80">
                  <td className="py-1 pr-2 font-medium text-white">{b.name}</td>
                  <td className="px-2 py-1 text-right">{ov(b.legalBalls)}</td>
                  <td className="px-2 py-1 text-right">{b.maidens}</td>
                  <td className="px-2 py-1 text-right">{b.runs}</td>
                  <td className="px-2 py-1 text-right font-semibold">{b.wickets}</td>
                  <td className="py-1 pl-2 text-right text-white/50">
                    {econ(b.runs, b.legalBalls)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
