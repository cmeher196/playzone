"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";
type CoinSide = "Heads" | "Tails";

export function CreateStandaloneMatchForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [teamAPlayers, setTeamAPlayers] = useState("");
  const [teamBPlayers, setTeamBPlayers] = useState("");
  const [overs, setOvers] = useState("6");
  const [date, setDate] = useState(today);
  const [venue, setVenue] = useState("");
  const [tossWinnerId, setTossWinnerId] = useState<"direct-a" | "direct-b">("direct-a");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bat");
  const [teamASide, setTeamASide] = useState<CoinSide>("Heads");
  const [coinResult, setCoinResult] = useState<CoinSide | null>(null);
  const [tossFlipped, setTossFlipped] = useState(false);
  const [tossCallerId, setTossCallerId] = useState<"direct-a" | "direct-b">("direct-a");
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const teamAPlayerList = teamAPlayers.split(",").map((name) => name.trim()).filter(Boolean);
  const teamBPlayerList = teamBPlayers.split(",").map((name) => name.trim()).filter(Boolean);
  const tossEnabled = teamAName.trim().length >= 2 && teamBName.trim().length >= 2 && teamAPlayerList.length >= 2 && teamBPlayerList.length >= 2;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const toPlayers = (value: string) => value.split(",").map((name) => name.trim()).filter(Boolean);
    const oversNumber = Number(overs);
    if (teamAName.trim() === teamBName.trim()) {
      setError("Pick two different team names.");
      return;
    }
    if (!tossEnabled) {
      setError("Add both team names and at least two players to each team before the toss.");
      return;
    }
    if (!tossFlipped) {
      setError("Click the coin to complete the virtual toss.");
      return;
    }
    if (!Number.isInteger(oversNumber) || oversNumber < 1 || oversNumber > 50) {
      setError("Enter between 1 and 50 overs.");
      return;
    }
    if (toPlayers(teamAPlayers).length < 2 || toPlayers(teamBPlayers).length < 2) {
      setError("Add at least two players to each team, separated by commas.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAName,
          teamBName,
          teamAPlayers: toPlayers(teamAPlayers),
          teamBPlayers: toPlayers(teamBPlayers),
          overs: oversNumber,
          date,
          venue,
          tossWinnerId,
          tossDecision,
        }),
      });
      const data = (await response.json()) as { error?: string; match?: { id: string } };
      if (!response.ok || !data.match) {
        setError(data.error ?? "Could not create the match.");
        return;
      }
      router.push(`/matches/${data.match.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Team A name</label>
          <input value={teamAName} onChange={(event) => setTeamAName(event.target.value)} className={inputClass} placeholder="The Strikers" />
        </div>
        <div>
          <label className={labelClass}>Team B name</label>
          <input value={teamBName} onChange={(event) => setTeamBName(event.target.value)} className={inputClass} placeholder="The Challengers" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Team A players</label>
          <textarea value={teamAPlayers} onChange={(event) => setTeamAPlayers(event.target.value)} className={`${inputClass} min-h-24`} placeholder="Player 1, Player 2, Player 3" />
        </div>
        <div>
          <label className={labelClass}>Team B players</label>
          <textarea value={teamBPlayers} onChange={(event) => setTeamBPlayers(event.target.value)} className={`${inputClass} min-h-24`} placeholder="Player 1, Player 2, Player 3" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Overs / side</label>
          <input type="number" min={1} max={50} value={overs} onChange={(event) => setOvers(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelClass}>Venue</label>
          <input value={venue} onChange={(event) => setVenue(event.target.value)} className={inputClass} placeholder="Optional" />
        </div>
      </div>
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-amber-200">Toss</div>
            <p className="mt-1 text-xs text-white/50">Team A chooses a side. Team B gets the other side. Click the coin to flip.</p>
          </div>
          <button type="button" disabled={coinFlipping || !tossEnabled} onClick={() => { if (coinFlipping || !tossEnabled) return; setCoinFlipping(true); setCoinResult(null); setTossFlipped(false); window.setTimeout(() => { const result: CoinSide = Math.random() < 0.5 ? "Heads" : "Tails"; const otherTeamId = tossCallerId === "direct-a" ? "direct-b" : "direct-a"; setCoinResult(result); setTossWinnerId(result === teamASide ? tossCallerId : otherTeamId); setTossFlipped(true); setCoinFlipping(false); }, 750); }} aria-label="Click coin to flip the virtual toss" className="group flex flex-col items-center gap-1 text-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
            <span className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-300/50 bg-amber-300/15 text-3xl shadow-lg shadow-amber-500/10 transition group-hover:scale-105 group-hover:border-amber-200 ${coinFlipping ? "animate-[spin_750ms_ease-in-out]" : ""}`}>{coinFlipping ? "✦" : coinResult ? (coinResult === "Heads" ? "H" : "T") : "🪙"}</span>
            <span className="text-xs font-semibold">{coinFlipping ? "Flipping…" : tossFlipped ? "Flip again" : "Click coin to flip"}</span>
          </button>
        </div>
        {!tossEnabled && <p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-200/80">Add both team names and at least two players to each team to enable the toss.</p>}
        <div className={`grid gap-4 sm:grid-cols-2 ${!tossEnabled ? "opacity-50" : ""}`}>
          <div>
            <label className={labelClass}>Who calls the toss?</label>
            <select disabled={!tossEnabled} value={tossCallerId} onChange={(event) => { setTossCallerId(event.target.value as "direct-a" | "direct-b"); setTossFlipped(false); setCoinResult(null); }} className={inputClass}>
              <option value="direct-a" className="bg-[#0a1712]">{teamAName || "Team A"}</option>
              <option value="direct-b" className="bg-[#0a1712]">{teamBName || "Team B"}</option>
            </select>
            <label className={`${labelClass} mt-3`}>{tossCallerId === "direct-a" ? teamAName || "Team A" : teamBName || "Team B"} chooses</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Heads", "Tails"] as const).map((side) => (
                <button key={side} disabled={!tossEnabled} type="button" onClick={() => { setTeamASide(side); setTossFlipped(false); setCoinResult(null); }} className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${teamASide === side ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"}`}>{side}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/50">Other team: {teamASide === "Heads" ? "Tails" : "Heads"}</p>
          </div>
          <div>
            <label className={labelClass}>Winner chooses to</label>
            <div className="grid grid-cols-2 gap-2">
            {(["bat", "bowl"] as const).map((decision) => (
              <button key={decision} disabled={!tossEnabled} type="button" onClick={() => setTossDecision(decision)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition disabled:cursor-not-allowed ${tossDecision === decision ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"}`}>
                {decision}
              </button>
            ))}
            </div>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80"><span className="text-white/40">Toss result: </span>{coinResult ? <><strong className="text-amber-200">{tossWinnerId === "direct-a" ? teamAName || "Team A" : teamBName || "Team B"}</strong> won with <strong>{coinResult}</strong>.</> : <span className="text-amber-200">Click the coin to flip.</span>}</p>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-60">
        {busy ? "Creating…" : "Create match & open scorer"}
      </button>
    </form>
  );
}