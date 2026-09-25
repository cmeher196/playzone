"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BadmintonTeam } from "@/lib/badminton-teams";

interface Player {
  id: string;
  name: string;
  gender?: string;
  mobile?: string;
}

export function AddBadmintonTeams({
  tournamentId,
  teamsInTournament,
  availableTeams,
  allPlayers,
  playerNames,
}: {
  tournamentId: string;
  teamsInTournament: BadmintonTeam[];
  availableTeams: BadmintonTeam[];
  allPlayers: Player[];
  playerNames: Record<string, string>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Inline create-a-team (organizer builds a team on the spot).
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const nameOf = (id: string) => playerNames[id] ?? id;

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableTeams;
    return availableTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.playerIds.some((pid) => nameOf(pid).toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, availableTeams, playerNames]);

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return allPlayers;
    return allPlayers.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.mobile ?? "").toLowerCase().includes(q),
    );
  }, [playerSearch, allPlayers]);

  async function addTeam(teamId: string) {
    setError("");
    setMessage("");
    setBusyId(teamId);
    try {
      const res = await fetch(`/api/badminton/tournaments/${tournamentId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add team");
        return;
      }
      setMessage("Team added to the tournament.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTeam(teamId: string) {
    setError("");
    setMessage("");
    setBusyId(teamId);
    try {
      const res = await fetch(`/api/badminton/tournaments/${tournamentId}/teams/${teamId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to remove team");
        return;
      }
      setMessage("Team removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusyId(null);
    }
  }

  function togglePlayer(playerId: string, checked: boolean) {
    setError("");
    if (checked) {
      if (selected.length >= 2) {
        setError("A team can have at most two players");
        return;
      }
      setSelected([...selected, playerId]);
    } else {
      setSelected(selected.filter((id) => id !== playerId));
    }
  }

  async function createAndAdd() {
    if (!name.trim()) {
      setError("Enter a team name");
      return;
    }
    if (selected.length < 1 || selected.length > 2) {
      setError("Pick one or two players");
      return;
    }
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const createRes = await fetch("/api/badminton/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), playerIds: selected }),
      });
      const created = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        setError(created.error ?? created.errors?.join(", ") ?? "Failed to create team");
        return;
      }
      const addRes = await fetch(`/api/badminton/tournaments/${tournamentId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: created.id }),
      });
      if (!addRes.ok) {
        const data = await addRes.json().catch(() => ({}));
        setError(data.error ?? "Team created but could not be added");
        return;
      }
      setName("");
      setSelected([]);
      setPlayerSearch("");
      setShowCreate(false);
      setMessage("Team created and added.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Teams ({teamsInTournament.length})</h2>
        <Link href="/badminton/teams" className="text-xs text-orange-300 transition hover:text-orange-200">
          Manage all teams →
        </Link>
      </div>

      {teamsInTournament.length > 0 ? (
        <div className="mb-5 grid gap-2 sm:grid-cols-2">
          {teamsInTournament.map((team) => (
            <div key={team.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{team.name}</p>
                <p className="truncate text-xs text-white/50">{team.playerIds.map(nameOf).join(" / ")}</p>
              </div>
              <button
                type="button"
                onClick={() => removeTeam(team.id)}
                disabled={busyId === team.id}
                className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-5 text-sm text-white/60">No teams added yet.</p>
      )}

      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams by name or player..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-300/60"
        />
      </div>

      {availableTeams.length === 0 ? (
        <p className="text-sm text-white/60">No other teams available. Create one below.</p>
      ) : filteredTeams.length === 0 ? (
        <p className="text-sm text-white/60">No teams match your search.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {filteredTeams.map((team) => (
            <div key={team.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{team.name}</p>
                <p className="truncate text-xs text-white/50">
                  {team.playerIds.map(nameOf).join(" / ")} · {team.playerIds.length === 2 ? "Doubles" : "Singles"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addTeam(team.id)}
                disabled={busyId === team.id}
                className="shrink-0 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {busyId === team.id ? "Adding..." : "Add"}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}

      <div className="mt-5 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="text-sm font-medium text-orange-300 transition hover:text-orange-200"
        >
          {showCreate ? "− Cancel new team" : "+ Create a new team"}
        </button>

        {showCreate && (
          <div className="mt-3 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name (e.g. Grape)"
              maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-300/60"
            />
            <p className="text-xs text-white/50">Players ({selected.length}/2)</p>
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-300/60"
            />
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {filteredPlayers.map((player) => {
                const checked = selected.includes(player.id);
                const disabled = !checked && selected.length >= 2;
                return (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 transition ${
                      checked
                        ? "border-orange-300/50 bg-orange-300/10"
                        : disabled
                          ? "border-white/10 bg-white/[0.02] opacity-50"
                          : "cursor-pointer border-white/10 bg-white/5 hover:border-orange-300/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => togglePlayer(player.id, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{player.name}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={createAndAdd}
              disabled={creating || !name.trim() || selected.length === 0}
              className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create & add team"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
