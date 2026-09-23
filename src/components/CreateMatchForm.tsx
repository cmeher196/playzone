"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeamOption {
  id: string;
  name: string;
  playerCount: number;
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";
type CoinSide = "Heads" | "Tails";

export function CreateMatchForm({
  tournamentId,
  teams,
}: {
  tournamentId: string;
  teams: TeamOption[];
}) {
  const router = useRouter();
  const [teamAId, setTeamAId] = useState(teams[0]?.id ?? "");
  const [teamBId, setTeamBId] = useState(teams[1]?.id ?? "");
  const [overs, setOvers] = useState("6");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tossWinnerId, setTossWinnerId] = useState(teams[0]?.id ?? "");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bat");
  const [tossFlipped, setTossFlipped] = useState(false);
  const [tossCallerId, setTossCallerId] = useState(teams[0]?.id ?? "");
  const [teamASide, setTeamASide] = useState<CoinSide>("Heads");
  const [coinResult, setCoinResult] = useState<CoinSide | null>(null);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const playerCountOf = (id: string) => teams.find((t) => t.id === id)?.playerCount ?? 0;
  const tossEnabled = teamAId !== teamBId && playerCountOf(teamAId) >= 2 && playerCountOf(teamBId) >= 2;

  function flipToss() {
    if (coinFlipping || !tossEnabled) return;
    setCoinFlipping(true);
    setCoinResult(null);
    setTossFlipped(false);
    window.setTimeout(() => {
      const result: CoinSide = Math.random() < 0.5 ? "Heads" : "Tails";
      const otherTeamId = tossCallerId === teamAId ? teamBId : teamAId;
      const winner = result === teamASide ? tossCallerId : otherTeamId;
      setCoinResult(result);
      setTossWinnerId(winner);
      setTossFlipped(true);
      setCoinFlipping(false);
    }, 750);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (teamAId === teamBId) {
      setError("Pick two different teams.");
      return;
    }
    if (!tossEnabled) {
      setError("Select two different teams with at least two players each before the toss.");
      return;
    }
    if (!tossFlipped) {
      setError("Click the coin to complete the virtual toss.");
      return;
    }
    const oversN = Number(overs);
    if (!Number.isInteger(oversN) || oversN < 1) {
      setError("Enter a valid number of overs.");
      return;
    }
    const winner = tossWinnerId === teamBId ? teamBId : teamAId;
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAId,
          teamBId,
          overs: oversN,
          venue: venue.trim() || undefined,
          date,
          tossWinnerId: winner,
          tossDecision,
        }),
      });
      const d = (await res.json()) as { error?: string; match?: { id: string } };
      if (!res.ok || !d.match) {
        setError(d.error ?? "Couldn't create the match.");
        return;
      }
      router.push(`/matches/${d.match.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Team A</label>
          <select
            className={inputClass}
            value={teamAId}
            onChange={(e) => {
              setTeamAId(e.target.value);
              if (tossWinnerId !== teamBId) setTossWinnerId(e.target.value);
              setTossFlipped(false);
              setCoinResult(null);
              setTossCallerId(e.target.value);
            }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0a1712]">
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Team B</label>
          <select
            className={inputClass}
            value={teamBId}
            onChange={(e) => {
              setTeamBId(e.target.value);
              if (tossWinnerId !== teamAId) setTossWinnerId(teamAId);
              setTossFlipped(false);
              setCoinResult(null);
              if (tossCallerId !== teamAId) setTossCallerId(e.target.value);
            }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0a1712]">
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Overs / side</label>
          <input
            type="number"
            min={1}
            max={50}
            value={overs}
            onChange={(e) => setOvers(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>
        <div>
          <label className={labelClass}>Venue</label>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-amber-200">Toss</div>
            <p className="mt-1 text-xs text-white/50">
              Team A chooses a side. Team B gets the other side. Click the coin to flip.
            </p>
          </div>
          <button type="button" onClick={flipToss} disabled={coinFlipping || !tossEnabled} aria-label="Click coin to flip the virtual toss" className="group flex flex-col items-center gap-1 text-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
            <span className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-300/50 bg-amber-300/15 text-3xl shadow-lg shadow-amber-500/10 transition group-hover:scale-105 group-hover:border-amber-200 ${coinFlipping ? "animate-[spin_750ms_ease-in-out]" : ""}`}>
              {coinFlipping ? "✦" : coinResult ? (coinResult === "Heads" ? "H" : "T") : "🪙"}
            </span>
            <span className="text-xs font-semibold">{coinFlipping ? "Flipping…" : tossFlipped ? "Flip again" : "Click coin to flip"}</span>
          </button>
        </div>

        {!tossEnabled && <p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-200/80">Add at least two players to both selected teams to enable the toss.</p>}
        <div className={`grid gap-4 sm:grid-cols-2 ${!tossEnabled ? "opacity-50" : ""}`}>
          <div>
            <label className={labelClass}>Who calls the toss?</label>
            <select disabled={!tossEnabled} className={inputClass} value={tossCallerId} onChange={(e) => { setTossCallerId(e.target.value); setTossFlipped(false); setCoinResult(null); }}>
              <option value={teamAId} className="bg-[#0a1712]">{nameOf(teamAId)}</option>
              <option value={teamBId} className="bg-[#0a1712]">{nameOf(teamBId)}</option>
            </select>
            <label className={`${labelClass} mt-3`}>{nameOf(tossCallerId)} chooses</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Heads", "Tails"] as const).map((side) => (
                <button key={side} disabled={!tossEnabled} type="button" onClick={() => { setTeamASide(side); setTossFlipped(false); setCoinResult(null); }} className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${teamASide === side ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"}`}>
                  {side}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/50">Other team: {teamASide === "Heads" ? "Tails" : "Heads"}</p>
          </div>
          <div>
            <label className={labelClass}>Elected to</label>
            <div className="grid grid-cols-2 gap-2">
              {(["bat", "bowl"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTossDecision(d)}
                  disabled={!tossEnabled}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                    tossDecision === d
                      ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80">
          <span className="text-white/40">Toss result: </span>
          {coinResult ? <><strong className="text-amber-200">{nameOf(tossWinnerId)}</strong> won with <strong>{coinResult}</strong> and chose to <strong>{tossDecision}</strong>.</> : <span className="text-amber-200">Click the coin to flip.</span>}
        </div>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create match & open scorer"}
      </button>
    </form>
  );
}
