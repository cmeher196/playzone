"use client";

import { useState } from "react";
import { ScoreboardView, type ScoreboardData } from "./ScoreboardView";
import type { ExtraType, WicketType } from "@/lib/live-scoring";

const WICKET_TYPES: WicketType[] = [
  "bowled",
  "caught",
  "lbw",
  "run-out",
  "stumped",
  "hit-wicket",
];

const selectClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60";

export function Scorer({
  matchId,
  initial,
}: {
  matchId: string;
  initial: ScoreboardData;
}) {
  const [data, setData] = useState<ScoreboardData>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingExtra, setPendingExtra] = useState<ExtraType | null>(null);
  const [showWicket, setShowWicket] = useState(false);

  const [strikerSel, setStrikerSel] = useState("");
  const [nonStrikerSel, setNonStrikerSel] = useState("");
  const [bowlerSel, setBowlerSel] = useState("");
  const [batterSel, setBatterSel] = useState("");
  const [wType, setWType] = useState<WicketType>("bowled");
  const [wDismissed, setWDismissed] = useState("");
  const [wFielder, setWFielder] = useState("");

  const live = data.live;
  const cur = live.innings[live.currentInnings];
  const completed = data.match.status === "completed";

  async function send(url: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      const d = (await res.json().catch(() => ({}))) as ScoreboardData & {
        error?: string;
      };
      if (!res.ok) {
        setError(d.error ?? "Action failed. Please try again.");
        return false;
      }
      setData({ match: d.match, live: d.live });
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const postEvent = (ev: unknown) =>
    send(`/api/matches/${matchId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ev),
    });

  async function tapRun(n: number) {
    let ev: Record<string, unknown>;
    if (!pendingExtra) ev = { t: "ball", runs: n };
    else if (pendingExtra === "no-ball")
      ev = { t: "ball", extraType: "no-ball", runs: n };
    else ev = { t: "ball", extraType: pendingExtra, extraRuns: n };
    const ok = await postEvent(ev);
    if (ok) setPendingExtra(null);
  }

  if (!cur) {
    return <ScoreboardView data={data} />;
  }

  const batting = cur.battingTeam.players;
  const bowling = cur.bowlingTeam.players;
  const outIds = new Set(cur.batters.filter((b) => b.out).map((b) => b.playerId));
  const crease = [cur.strikerId, cur.nonStrikerId].filter(Boolean) as string[];
  const availableBatters = batting.filter(
    (p) => !outIds.has(p.playerId) && !crease.includes(p.playerId),
  );

  const inningsOver = cur.oversDone || cur.allOut;
  const isSecond = live.currentInnings === 1;

  async function submitOpeners() {
    if (!strikerSel || !nonStrikerSel || strikerSel === nonStrikerSel) {
      setError("Pick two different batters.");
      return;
    }
    const ok = await postEvent({
      t: "openers",
      strikerId: strikerSel,
      nonStrikerId: nonStrikerSel,
    });
    if (ok) {
      setStrikerSel("");
      setNonStrikerSel("");
    }
  }

  async function submitWicket() {
    const dismissed = wDismissed || cur!.strikerId;
    if (!dismissed) return;
    const ok = await postEvent({
      t: "ball",
      runs: 0,
      wicket: {
        type: wType,
        dismissedId: dismissed,
        ...(wFielder ? { fielderId: wFielder } : {}),
      },
    });
    if (ok) {
      setShowWicket(false);
      setWFielder("");
      setWDismissed("");
      setWType("bowled");
    }
  }

  return (
    <div className="space-y-5">
      <ScoreboardView data={data} />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          {error}
        </div>
      )}

      {completed ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-4 text-center text-emerald-200">
          Match completed. Stats &amp; rankings have been updated.
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          {live.canComplete ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                send(`/api/matches/${matchId}/complete`, { method: "POST" })
              }
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50"
            >
              ✅ Complete match — {live.result}
            </button>
          ) : inningsOver && !isSecond ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => postEvent({ t: "endInnings" })}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-3 text-base font-semibold text-amber-950 transition hover:from-amber-400 hover:to-amber-300 disabled:opacity-50"
            >
              Innings over — start 2nd innings →
            </button>
          ) : cur.needOpeners ? (
            <Setup title="Select opening batters">
              <div className="grid gap-2 sm:grid-cols-2">
                <select className={selectClass} value={strikerSel} onChange={(e) => setStrikerSel(e.target.value)}>
                  <option value="">Striker…</option>
                  {batting.map((p) => (
                    <option key={p.playerId} value={p.playerId} className="bg-[#0a1712]">
                      {p.name}
                    </option>
                  ))}
                </select>
                <select className={selectClass} value={nonStrikerSel} onChange={(e) => setNonStrikerSel(e.target.value)}>
                  <option value="">Non-striker…</option>
                  {batting
                    .filter((p) => p.playerId !== strikerSel)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId} className="bg-[#0a1712]">
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <ConfirmButton onClick={submitOpeners} busy={busy}>
                Start innings
              </ConfirmButton>
            </Setup>
          ) : cur.needBowler ? (
            <Setup title="Select the bowler for this over">
              <select className={selectClass} value={bowlerSel} onChange={(e) => setBowlerSel(e.target.value)}>
                <option value="">Bowler…</option>
                {bowling.map((p) => (
                  <option key={p.playerId} value={p.playerId} className="bg-[#0a1712]">
                    {p.name}
                  </option>
                ))}
              </select>
              <ConfirmButton
                busy={busy}
                onClick={async () => {
                  if (!bowlerSel) return;
                  const ok = await postEvent({ t: "bowler", bowlerId: bowlerSel });
                  if (ok) setBowlerSel("");
                }}
              >
                Confirm bowler
              </ConfirmButton>
            </Setup>
          ) : cur.needBatter ? (
            <Setup title="Wicket! Select the next batter">
              <select className={selectClass} value={batterSel} onChange={(e) => setBatterSel(e.target.value)}>
                <option value="">Next batter…</option>
                {availableBatters.map((p) => (
                  <option key={p.playerId} value={p.playerId} className="bg-[#0a1712]">
                    {p.name}
                  </option>
                ))}
              </select>
              <ConfirmButton
                busy={busy}
                onClick={async () => {
                  if (!batterSel) return;
                  const ok = await postEvent({ t: "newBatter", batterId: batterSel });
                  if (ok) setBatterSel("");
                }}
              >
                Send batter in
              </ConfirmButton>
            </Setup>
          ) : showWicket ? (
            <Setup title="How was the batter out?">
              <div className="grid gap-2 sm:grid-cols-3">
                <select className={selectClass} value={wType} onChange={(e) => setWType(e.target.value as WicketType)}>
                  {WICKET_TYPES.map((w) => (
                    <option key={w} value={w} className="bg-[#0a1712]">
                      {w}
                    </option>
                  ))}
                </select>
                <select className={selectClass} value={wDismissed} onChange={(e) => setWDismissed(e.target.value)}>
                  <option value="">Out: striker</option>
                  {crease.map((id) => {
                    const b = cur.batters.find((x) => x.playerId === id);
                    return (
                      <option key={id} value={id} className="bg-[#0a1712]">
                        {b?.name ?? id}
                      </option>
                    );
                  })}
                </select>
                <select className={selectClass} value={wFielder} onChange={(e) => setWFielder(e.target.value)}>
                  <option value="">Fielder (optional)</option>
                  {bowling.map((p) => (
                    <option key={p.playerId} value={p.playerId} className="bg-[#0a1712]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <ConfirmButton onClick={submitWicket} busy={busy}>
                  Confirm wicket
                </ConfirmButton>
                <button
                  type="button"
                  onClick={() => setShowWicket(false)}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </Setup>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["wide", "no-ball", "bye", "leg-bye"] as ExtraType[]).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPendingExtra(pendingExtra === ex ? null : ex)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      pendingExtra === ex
                        ? "border-amber-400 bg-amber-400/15 text-amber-200"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                    }`}
                  >
                    {ex === "wide" ? "Wide" : ex === "no-ball" ? "No ball" : ex === "bye" ? "Bye" : "Leg bye"}
                  </button>
                ))}
              </div>
              {pendingExtra && (
                <p className="text-xs text-amber-300/80">
                  {pendingExtra} selected — tap runs to record (tap 0 for none).
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[0, 1, 2, 3, 4, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => tapRun(n)}
                    className="rounded-2xl border border-white/10 bg-white/5 py-5 text-xl font-bold text-white transition hover:border-emerald-400/50 hover:bg-emerald-400/10 disabled:opacity-50"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowWicket(true)}
                className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                🎯 Wicket
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => send(`/api/matches/${matchId}/undo`, { method: "POST" })}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50"
            >
              ↶ Undo last
            </button>
            {!inningsOver && !cur.needOpeners && !live.canComplete && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm("End the current innings now?")) postEvent({ t: "endInnings" });
                }}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50"
              >
                End innings
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Setup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-emerald-100/80">{title}</h3>
      {children}
    </div>
  );
}

function ConfirmButton({
  onClick,
  busy,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
