"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  gender?: string;
  mobile?: string;
}

export function AddParticipantsForm({
  tournamentId,
  availablePlayers,
  existingIds,
}: {
  tournamentId: string;
  availablePlayers: Player[];
  existingIds: string[];
}) {
  const router = useRouter();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availablePlayers;
    return availablePlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.mobile ?? "").toLowerCase().includes(q),
    );
  }, [search, availablePlayers]);

  async function handleAddParticipants() {
    if (selectedPlayers.length === 0) {
      setError("Select at least one player");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextIds = Array.from(new Set([...existingIds, ...selectedPlayers]));
      const response = await fetch(`/api/badminton/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: nextIds }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to add participants");
        return;
      }

      router.refresh();
      setSelectedPlayers([]);
      setSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="mb-4 text-lg font-semibold">Add Players to League</h3>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or mobile number..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-300/60"
        />
      </div>

      {availablePlayers.length === 0 ? (
        <p className="text-sm text-white/60">All registered players are already in this league.</p>
      ) : filteredPlayers.length === 0 ? (
        <p className="text-sm text-white/60">No players match your search.</p>
      ) : (
        <>
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {filteredPlayers.map((player) => (
              <label key={player.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer hover:border-orange-300/40 transition">
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPlayers([...selectedPlayers, player.id]);
                    } else {
                      setSelectedPlayers(selectedPlayers.filter((id) => id !== player.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{player.name}</p>
                  <p className="text-xs text-white/50">
                    {player.gender ?? ""}
                    {player.mobile ? ` · ${player.mobile}` : ""}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-rose-400 mb-3">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAddParticipants}
              disabled={loading || selectedPlayers.length === 0}
              className="flex-1 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-50 transition hover:bg-emerald-300"
            >
              {loading ? "Adding..." : `Add ${selectedPlayers.length} player${selectedPlayers.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
