"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BadmintonMatch, Court } from "@/lib/badminton-tournaments";

interface Participant {
  id: string;
  name: string;
}

function statusBadge(status: string): string {
  switch (status) {
    case "live":
      return "bg-rose-400/20 text-rose-300";
    case "completed":
      return "bg-emerald-400/20 text-emerald-300";
    case "paused":
      return "bg-amber-400/20 text-amber-300";
    default:
      return "bg-white/10 text-white/60";
  }
}

export function BadmintonMatchManager({
  tournamentId,
  matches,
  courts,
  participants,
  playerNames,
  defaultBestOf = 3,
  defaultPointsToWin = 21,
}: {
  tournamentId: string;
  matches: BadmintonMatch[];
  courts: Court[];
  participants: Participant[];
  playerNames: Record<string, string>;
  defaultBestOf?: number;
  defaultPointsToWin?: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    courtId: string;
    format: "singles" | "doubles";
    playerA: string;
    playerB: string;
    playerC: string;
    playerD: string;
    bestOf: number;
    pointsToWin: number;
  }>({
    courtId: "",
    format: "singles",
    playerA: "",
    playerB: "",
    playerC: "",
    playerD: "",
    bestOf: defaultBestOf,
    pointsToWin: defaultPointsToWin,
  });

  const nameOf = (playerId: string) => playerNames[playerId] ?? playerId;
  const courtOf = (courtId: string) => courts.find((c) => c.id === courtId)?.number ?? "?";

  async function assignScorer(matchId: string, scorerId: string) {
    setError("");
    setMessage("");
    setBusyId(matchId);
    try {
      const url = `/api/badminton/tournaments/${tournamentId}/matches/${matchId}/scorer`;
      const res = scorerId
        ? await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scorerId }),
          })
        : await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update scorer");
        return;
      }
      setMessage(scorerId ? "Scorer assigned successfully." : "Scorer removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(matchId: string, status: string) {
    setError("");
    setMessage("");
    setBusyId(matchId);
    try {
      const res = await fetch(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update match");
        return;
      }
      setMessage(
        status === "live"
          ? "Match is now live."
          : status === "paused"
            ? "Match paused."
            : "Match updated.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMatch(matchId: string) {
    setError("");
    setMessage("");
    setBusyId(matchId);
    try {
      const res = await fetch(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete match");
        return;
      }
      setDeletingId(null);
      setMessage("Match deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(match: BadmintonMatch) {
    setError("");
    setEditingId(match.id);
    setEditForm({
      courtId: match.courtId,
      format: match.format,
      playerA: match.playerA,
      playerB: match.playerB,
      playerC: match.playerC ?? "",
      playerD: match.playerD ?? "",
      bestOf: match.bestOf ?? defaultBestOf,
      pointsToWin: match.pointsToWin ?? defaultPointsToWin,
    });
  }

  async function saveEdit(matchId: string) {
    setError("");
    setMessage("");
    setBusyId(matchId);
    try {
      const body: Record<string, unknown> = {
        courtId: editForm.courtId,
        format: editForm.format,
        playerA: editForm.playerA,
        playerB: editForm.playerB,
        bestOf: Math.max(1, Math.min(15, Number.isFinite(editForm.bestOf) ? editForm.bestOf : 3)),
        pointsToWin: Math.max(5, Math.min(99, Number.isFinite(editForm.pointsToWin) ? editForm.pointsToWin : 21)),
      };
      if (editForm.format === "doubles") {
        body.playerC = editForm.playerC;
        body.playerD = editForm.playerD;
      }
      const res = await fetch(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save match");
        return;
      }
      setEditingId(null);
      setMessage("Match updated successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusyId(null);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Matches &amp; Scorers</h2>
        <Link
          href={`/badminton/${tournamentId}/control`}
          className="rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-1.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-300/20"
        >
          Live Control Room →
        </Link>
      </div>

      {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
      {message && <p className="mb-3 text-sm text-emerald-300">{message}</p>}

      <div className="space-y-3">
        {matches.map((match) => {
          const teamA =
            match.format === "doubles"
              ? `${nameOf(match.playerA)} / ${nameOf(match.playerC ?? "")}`
              : nameOf(match.playerA);
          const teamB =
            match.format === "doubles"
              ? `${nameOf(match.playerB)} / ${nameOf(match.playerD ?? "")}`
              : nameOf(match.playerB);
          const busy = busyId === match.id;

          return (
            <div key={match.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/50">
                    {match.round ? `${match.round} · ` : ""}Court {courtOf(match.courtId)} · {match.format}
                  </p>
                  <p className="mt-1 font-medium">
                    {match.playerA ? teamA : <span className="text-white/40">TBD</span>}{" "}
                    <span className="text-white/30">vs</span>{" "}
                    {match.playerB ? teamB : <span className="text-white/40">TBD</span>}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(match.status)}`}>
                  {match.isBye ? "bye" : match.status}
                </span>
              </div>

              {editingId === match.id ? (
                <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-white/60">
                      Court
                      <select
                        value={editForm.courtId}
                        onChange={(e) => setEditForm({ ...editForm, courtId: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none"
                      >
                        {courts.map((c) => (
                          <option key={c.id} value={c.id}>
                            Court {c.number}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-white/60">
                      Format
                      <select
                        value={editForm.format}
                        onChange={(e) =>
                          setEditForm({ ...editForm, format: e.target.value as "singles" | "doubles" })
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none"
                      >
                        <option value="singles">Singles</option>
                        <option value="doubles">Doubles</option>
                      </select>
                    </label>
                    {(
                      ["playerA", "playerB", ...(editForm.format === "doubles" ? ["playerC", "playerD"] : [])] as Array<
                        "playerA" | "playerB" | "playerC" | "playerD"
                      >
                    ).map((key) => (
                        <label key={key} className="text-xs text-white/60">
                          {key === "playerA"
                            ? "Player A"
                            : key === "playerB"
                              ? "Player B"
                              : key === "playerC"
                                ? "Partner A"
                                : "Partner B"}
                          <select
                            value={editForm[key]}
                            onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none"
                          >
                            <option value="">— Select —</option>
                            {participants.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ),
                    )}
                    <label className="text-xs text-white/60">
                      Games (best of)
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={Number.isNaN(editForm.bestOf) ? "" : editForm.bestOf}
                        onChange={(e) => setEditForm({ ...editForm, bestOf: e.target.valueAsNumber })}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none"
                      />
                    </label>
                    <label className="text-xs text-white/60">
                      Points to win
                      <input
                        type="number"
                        min={5}
                        max={99}
                        value={Number.isNaN(editForm.pointsToWin) ? "" : editForm.pointsToWin}
                        onChange={(e) => setEditForm({ ...editForm, pointsToWin: e.target.valueAsNumber })}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(match.id)}
                      disabled={busy}
                      className="flex-1 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
                    >
                      {busy ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : deletingId === match.id ? (
                <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3">
                  <p className="text-sm text-rose-100">Delete this match and its scores?</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMatch(match.id)}
                      disabled={busy}
                      className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
                    >
                      {busy ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <select
                    value={match.assignedScorerId ?? ""}
                    disabled={busy}
                    onChange={(e) => assignScorer(match.id, e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
                  >
                    <option value="">— No scorer —</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  {match.status === "scheduled" || match.status === "ready" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy || !match.assignedScorerId || !match.playerA || !match.playerB}
                        onClick={() => setStatus(match.id, "live")}
                        title={
                          !match.playerA || !match.playerB
                            ? "Waiting for players"
                            : !match.assignedScorerId
                              ? "Assign a scorer first"
                              : "Start match"
                        }
                        className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(match)}
                        className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </>
                  ) : null}

                  {match.status === "live" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(match.id, "paused")}
                        className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-300/20 disabled:opacity-50"
                      >
                        Pause
                      </button>
                      <Link
                        href={`/badminton/${tournamentId}/matches/${match.id}/score`}
                        className="rounded-lg bg-orange-400 px-3 py-2 text-sm font-semibold text-orange-950 transition hover:bg-orange-300"
                      >
                        Open Scorer →
                      </Link>
                    </>
                  )}

                  {match.status === "paused" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setStatus(match.id, "live")}
                      className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
                    >
                      Resume
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeletingId(match.id)}
                    className="ml-auto rounded-lg border border-rose-400/30 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
