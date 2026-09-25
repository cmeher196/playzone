"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Court, BadmintonMatchFormat } from "@/lib/badminton-tournaments";

interface Player {
  id: string;
  name: string;
}

export interface MatchTeamOption {
  id: string;
  name: string;
  playerLabel: string; // "Deepak / Chandra"
  size: number; // 1 (singles) or 2 (doubles)
}

/** Searchable team selector: filter by team name or any member's name. */
function TeamPicker({
  label,
  teams,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  teams: MatchTeamOption[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = teams.find((t) => t.id === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams
      .filter((t) => t.id !== excludeId)
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.playerLabel.toLowerCase().includes(q));
  }, [teams, search, excludeId]);

  return (
    <div>
      <label className="block text-sm text-white/70 mb-2">{label}</label>
      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-300/40 bg-orange-300/10 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{selected.name}</p>
            <p className="truncate text-xs text-white/50">{selected.playerLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearch("");
              setOpen(true);
            }}
            className="shrink-0 text-xs text-white/60 transition hover:text-white"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search team by name or player..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-orange-300/60"
          />
          {open && (
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-white/50">No teams match.</p>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(t.id);
                      setSearch("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{t.name}</span>
                      <span className="block truncate text-xs text-white/50">{t.playerLabel}</span>
                    </span>
                    <span className="shrink-0 text-xs text-white/40">{t.size === 2 ? "Doubles" : "Singles"}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CreateBadmintonMatchForm({
  tournamentId,
  courts,
  participants,
  teams = [],
  defaultBestOf,
  defaultPointsToWin,
}: {
  tournamentId: string;
  courts: Court[];
  participants: Player[];
  teams?: MatchTeamOption[];
  defaultBestOf?: number;
  defaultPointsToWin?: number;
}) {
  const router = useRouter();
  const hasTeams = teams.length >= 2;
  const [mode, setMode] = useState<"players" | "teams">(hasTeams ? "teams" : "players");
  const [format, setFormat] = useState<BadmintonMatchFormat>("singles");
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [playerC, setPlayerC] = useState("");
  const [playerD, setPlayerD] = useState("");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [bestOf, setBestOf] = useState(defaultBestOf ?? 3);
  const [pointsToWin, setPointsToWin] = useState(defaultPointsToWin ?? 21);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clampedBestOf = () => Math.max(1, Math.min(15, Number.isFinite(bestOf) ? bestOf : 3));
  const clampedPoints = () => Math.max(5, Math.min(99, Number.isFinite(pointsToWin) ? pointsToWin : 21));

  async function handleCreatePlayerMatch(e: React.FormEvent) {
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
          bestOf: clampedBestOf(),
          pointsToWin: clampedPoints(),
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

  async function handleCreateTeamMatch(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!courtId || !teamAId || !teamBId) {
      setError("Select a court and two teams");
      return;
    }
    if (teamAId === teamBId) {
      setError("Teams must be different");
      return;
    }
    const a = teams.find((t) => t.id === teamAId);
    const b = teams.find((t) => t.id === teamBId);
    if (a && b && a.size !== b.size) {
      setError("Both teams must be the same size (both singles or both doubles)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/badminton/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          teamAId,
          teamBId,
          bestOf: clampedBestOf(),
          pointsToWin: clampedPoints(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? data.errors?.join(", ") ?? "Failed to create match");
        return;
      }

      router.refresh();
      setTeamAId("");
      setTeamBId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (participants.length < 2 && teams.length < 2) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/60">Add at least 2 players or 2 teams to create matches</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={mode === "teams" ? handleCreateTeamMatch : handleCreatePlayerMatch}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold">Create Match</h3>

      {hasTeams && (
        <div>
          <label className="block text-sm text-white/70 mb-2">Match by</label>
          <div className="flex gap-2">
            {(["teams", "players"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === m
                    ? "bg-orange-400 text-orange-950"
                    : "border border-white/10 bg-white/5 text-white hover:border-orange-400/50"
                }`}
              >
                {m === "teams" ? "Teams" : "Players"}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {mode === "players" && (
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
      )}

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

      {mode === "teams" ? (
        <>
          <TeamPicker label="Team A" teams={teams} value={teamAId} onChange={setTeamAId} excludeId={teamBId} />
          <TeamPicker label="Team B" teams={teams} value={teamBId} onChange={setTeamBId} excludeId={teamAId} />
          <p className="text-xs text-white/50">
            Format is set automatically — singles for one-player teams, doubles for two-player teams.
          </p>
        </>
      ) : (
        <>
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
