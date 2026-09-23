"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeamOption {
  id: string;
  name: string;
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => teams.find((t) => t.id === id)?.name ?? id;

  function flipToss() {
    const winner = Math.random() < 0.5 ? teamAId : teamBId;
    setTossWinnerId(winner);
    setTossFlipped(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (teamAId === teamBId) {
      setError("Pick two different teams.");
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
              Flip a virtual coin, or enter the real toss result manually.
            </p>
          </div>
          <button
            type="button"
            onClick={flipToss}
            className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/20"
          >
            🪙 {tossFlipped ? "Flip again" : "Flip coin"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Toss won by</label>
            <select
              className={inputClass}
              value={tossWinnerId}
              onChange={(e) => {
                setTossWinnerId(e.target.value);
                setTossFlipped(false);
              }}
            >
              <option value={teamAId} className="bg-[#0a1712]">
                {nameOf(teamAId)}
              </option>
              <option value={teamBId} className="bg-[#0a1712]">
                {nameOf(teamBId)}
              </option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Elected to</label>
            <div className="grid grid-cols-2 gap-2">
              {(["bat", "bowl"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTossDecision(d)}
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
          <strong className="text-amber-200">{nameOf(tossWinnerId)}</strong>{" "}
          won the toss and chose to <strong>{tossDecision}</strong>.
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
