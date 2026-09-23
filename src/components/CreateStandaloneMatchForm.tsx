"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const toPlayers = (value: string) => value.split(",").map((name) => name.trim()).filter(Boolean);
    const oversNumber = Number(overs);
    if (teamAName.trim() === teamBName.trim()) {
      setError("Pick two different team names.");
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
        <div className="mb-3 text-sm font-semibold text-amber-200">Toss</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <select value={tossWinnerId} onChange={(event) => setTossWinnerId(event.target.value as "direct-a" | "direct-b")} className={inputClass}>
            <option value="direct-a" className="bg-[#0a1712]">{teamAName || "Team A"}</option>
            <option value="direct-b" className="bg-[#0a1712]">{teamBName || "Team B"}</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            {(["bat", "bowl"] as const).map((decision) => (
              <button key={decision} type="button" onClick={() => setTossDecision(decision)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${tossDecision === decision ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"}`}>
                {decision}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-60">
        {busy ? "Creating…" : "Create match & open scorer"}
      </button>
    </form>
  );
}