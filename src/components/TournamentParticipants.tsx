"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TournamentParticipants({
  tournamentId,
  participants,
  canManage,
}: {
  tournamentId: string;
  participants: { playerId: string; name: string; transactionId: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(playerId: string) {
    setRemoving(playerId);
    setError(null);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) { setError(data.error ?? "Couldn't remove player."); return; }
      router.refresh();
    } catch { setError("Network error. Please try again."); }
    finally { setRemoving(null); }
  }

  if (participants.length === 0) return <p className="text-sm text-white/40">No players yet. Be the first to join!</p>;
  return (
    <>
      <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {participants.map((participant) => (
          <li key={participant.playerId} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <span className="text-white">{participant.name}</span>
            <span className="flex items-center gap-2">
              {canManage && participant.transactionId && <span className="font-mono text-xs text-white/40">{participant.transactionId}</span>}
              {canManage && <button type="button" onClick={() => remove(participant.playerId)} disabled={removing !== null} className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">{removing === participant.playerId ? "Removing..." : "Remove"}</button>}
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </>
  );
}
