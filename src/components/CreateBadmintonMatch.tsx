"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Court, BadmintonMatchFormat } from "@/lib/badminton-tournaments";

interface Player {
  id: string;
  name: string;
}

export function CreateBadmintonMatchForm({
  tournamentId,
  courts,
  participants,
  defaultBestOf,
  defaultPointsToWin,
}: {
  tournamentId: string;
  courts: Court[];
  participants: Player[];
  defaultBestOf?: number;
  defaultPointsToWin?: number;
}) {
  const router = useRouter();
  const [format, setFormat] = useState<BadmintonMatchFormat>("singles");
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [playerC, setPlayerC] = useState("");
  const [playerD, setPlayerD] = useState("");
  const [bestOf, setBestOf] = useState(defaultBestOf ?? 3);
  const [pointsToWin, setPointsToWin] = useState(defaultPointsToWin ?? 21);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!courtId || !playerA || !playerB) {
      setError("Select court and at least 2 players");
      return;
    }

    if (format === "doubles" && (!playerC || !playerD)) {
      setError("Select 4 players for doubles match");
      return;
    }

    if (format === "singles" && (playerA === playerB)) {
      setError("Players must be different");
      return;
    }

    if (format === "doubles" && (new Set([playerA, playerB, playerC, playerD]).size !== 4)) {
      setError("All players must be different");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/badminton/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          format,
          playerA,
          playerB,
          ...(format === "doubles" ? { playerC, playerD } : {}),
          bestOf: Math.max(1, Math.min(15, Number.isFinite(bestOf) ? bestOf : 3)),
          pointsToWin: Math.max(5, Math.min(99, Number.isFinite(pointsToWin) ? pointsToWin : 21)),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? data.errors?.join(", ") ?? "Failed to create match");
        return;
      }

      router.refresh();
      setPlayerA("");
      setPlayerB("");
      setPlayerC("");
      setPlayerD("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (participants.length < 2) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/60">Add at least 2 players to create matches</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreateMatch} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
      <h3 className="text-lg font-semibold">Create Match</h3>

      <div>
        <label className="block text-sm text-white/70 mb-2">Court</label>
        <select
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
        >
          {courts.map((court) => (
            <option key={court.id} value={court.id}>
              Court {court.number}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-2">Format</label>
        <div className="flex gap-2">
          {["singles", "doubles"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f as BadmintonMatchFormat)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                format === f
                  ? "bg-orange-400 text-orange-950"
                  : "border border-white/10 bg-white/5 text-white hover:border-orange-400/50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-white/70 mb-2">Games (best of)</label>
          <input
            type="number"
            min={1}
            max={15}
            value={Number.isNaN(bestOf) ? "" : bestOf}
            onChange={(e) => setBestOf(e.target.valueAsNumber)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
          />
          <p className="mt-1 text-xs text-white/50">Default 3</p>
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-2">Points to win</label>
          <input
            type="number"
            min={5}
            max={99}
            value={Number.isNaN(pointsToWin) ? "" : pointsToWin}
            onChange={(e) => setPointsToWin(e.target.valueAsNumber)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
          />
          <p className="mt-1 text-xs text-white/50">Default 21</p>
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-2">Player A</label>
        <select
          value={playerA}
          onChange={(e) => setPlayerA(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
        >
          <option value="">Select player</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-2">Player B</label>
        <select
          value={playerB}
          onChange={(e) => setPlayerB(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
        >
          <option value="">Select player</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {format === "doubles" && (
        <>
          <div>
            <label className="block text-sm text-white/70 mb-2">Player C</label>
            <select
              value={playerC}
              onChange={(e) => setPlayerC(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
            >
              <option value="">Select player</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Player D</label>
            <select
              value={playerD}
              onChange={(e) => setPlayerD(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
            >
              <option value="">Select player</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-50 transition hover:bg-emerald-300"
      >
        {loading ? "Creating..." : "Create Match"}
      </button>
    </form>
  );
}
