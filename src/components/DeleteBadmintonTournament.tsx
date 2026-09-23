"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteBadmintonTournament({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/badminton/tournaments/${tournamentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete tournament");
        setDeleting(false);
        return;
      }
      router.push("/badminton");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-400/20"
      >
        Delete League
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setShowDialog(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--page-bg)] p-6 shadow-2xl shadow-black/50"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-400/15 text-xl text-rose-300">
              🗑️
            </div>
            <h2 className="text-lg font-semibold text-white">Delete this league?</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              <span className="font-medium text-white/80">{tournamentName}</span> and all its courts,
              matches, and scores will be permanently removed. This cannot be undone.
            </p>

            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDialog(false)}
                className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
