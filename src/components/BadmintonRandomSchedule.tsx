"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BadmintonMatchFormat } from "@/lib/badminton-tournaments";

export function BadmintonRandomSchedule({
  tournamentId,
  participantCount,
  hasMatches,
}: {
  tournamentId: string;
  participantCount: number;
  hasMatches: boolean;
}) {
  const router = useRouter();
  const [format, setFormat] = useState<BadmintonMatchFormat>("singles");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const minPlayers = format === "doubles" ? 4 : 2;

  async function generate(reset: boolean) {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`/api/badminton/tournaments/${tournamentId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, reset }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && data.code === "already-exists") {
          setConfirmReset(true);
          return;
        }
        setError(data.error ?? "Failed to generate schedule");
        return;
      }
      setMessage(
        `Created a ${data.rounds}-round knockout bracket (${data.created} match${data.created === 1 ? "" : "es"})`,
      );
      setConfirmReset(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-orange-300/20 bg-orange-300/[0.04] p-6">
      <h3 className="text-lg font-semibold">Knockout Schedule</h3>
      <p className="mt-1 text-sm text-white/60">
        Randomly seed players into a single-elimination bracket — winners advance to the final.
      </p>

      <div className="mt-4">
        <label className="block text-sm text-white/70 mb-2">Format</label>
        <div className="flex gap-2">
          {(["singles", "doubles"] as BadmintonMatchFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
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

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}

      {confirmReset ? (
        <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
          <p className="text-sm text-amber-100">
            A schedule already exists. Regenerating will delete all current matches and scores.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              disabled={loading}
              className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => generate(true)}
              disabled={loading}
              className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
            >
              {loading ? "Regenerating..." : "Delete & regenerate"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => generate(false)}
          disabled={loading || participantCount < minPlayers}
          title={participantCount < minPlayers ? `Need at least ${minPlayers} players` : "Generate bracket"}
          className="mt-4 w-full rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-orange-950 transition hover:bg-orange-300 disabled:opacity-50"
        >
          {loading ? "Generating..." : hasMatches ? "🎲 Regenerate bracket" : "🎲 Generate knockout bracket"}
        </button>
      )}
    </div>
  );
}

