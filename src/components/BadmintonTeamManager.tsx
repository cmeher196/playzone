"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BadmintonTeam } from "@/lib/badminton-teams";

interface Player {
  id: string;
  name: string;
  gender?: string;
  mobile?: string;
}

export function BadmintonTeamManager({
  allPlayers,
  initialTeams,
  currentUserId,
  isAdmin = false,
}: {
  allPlayers: Player[];
  initialTeams: BadmintonTeam[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map(allPlayers.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [allPlayers]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPlayers;
    return allPlayers.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.mobile ?? "").toLowerCase().includes(q),
    );
  }, [search, allPlayers]);

  function toggle(playerId: string, checked: boolean) {
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

  async function handleCreate() {
    if (!name.trim()) {
      setError("Enter a team name");
      return;
    }
    if (selected.length < 1 || selected.length > 2) {
      setError("Pick one or two players");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/badminton/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), playerIds: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? data.errors?.join(", ") ?? "Failed to create team");
        return;
      }
      setName("");
      setSelected([]);
      setSearch("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(teamId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/badminton/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete team");
        return;
      }
      setDeletingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-1 text-lg font-semibold">Create a team</h2>
        <p className="mb-4 text-sm text-white/50">A team has one player (singles) or two players (doubles).</p>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-white/70">Team name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grape"
            maxLength={60}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-300/60"
          />
        </label>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-white/70">Players ({selected.length}/2)</span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or mobile number..."
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-300/60"
        />

        <div className="mb-4 max-h-80 space-y-2 overflow-y-auto">
          {filteredPlayers.length === 0 ? (
            <p className="text-sm text-white/60">No players match your search.</p>
          ) : (
            filteredPlayers.map((player) => {
              const checked = selected.includes(player.id);
              const disabled = !checked && selected.length >= 2;
              return (
                <label
                  key={player.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition ${
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
                    onChange={(e) => toggle(player.id, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{player.name}</p>
                    <p className="text-xs text-white/50">
                      {player.gender ?? ""}
                      {player.mobile ? ` · ${player.mobile}` : ""}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || !name.trim() || selected.length === 0}
          className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Create team"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-4 text-lg font-semibold">{isAdmin ? "All teams" : "My teams"}</h2>
        {initialTeams.length === 0 ? (
          <p className="text-sm text-white/60">No teams yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {initialTeams.map((team) => (
              <div key={team.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{team.name}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {team.playerIds.map(nameOf).join(" / ")}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {team.playerIds.length === 2 ? "Doubles" : "Singles"}
                      {isAdmin && team.ownerId !== currentUserId ? ` · owner ${team.ownerName}` : ""}
                    </p>
                  </div>
                  {deletingId === team.id ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        disabled={loading}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(team.id)}
                        disabled={loading}
                        className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(team.id)}
                      className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-rose-400/50 hover:text-rose-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
