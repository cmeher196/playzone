"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TournamentInitial {
  name: string;
  venue?: string;
  description?: string;
  entryFee: number;
  matchDates: string[];
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";

export function ManageTournament({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  initial: TournamentInitial;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial.name);
  const [venue, setVenue] = useState(initial.venue ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [entryFee, setEntryFee] = useState(String(initial.entryFee));
  const [dates, setDates] = useState<string[]>(
    initial.matchDates.length ? initial.matchDates : [""],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateDate(i: number, v: string) {
    setDates((d) => d.map((x, idx) => (idx === i ? v : x)));
  }

  async function save() {
    setError(null);
    const matchDates = dates.map((d) => d.trim()).filter(Boolean);
    if (name.trim().length < 3)
      return setError("Name must be at least 3 characters.");
    if (matchDates.length === 0) return setError("Add at least one match date.");
    const fee = Number(entryFee || 0);
    if (!Number.isFinite(fee) || fee < 0)
      return setError("Enter a valid entry fee.");
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          venue: venue.trim() || undefined,
          description: description.trim() || undefined,
          entryFee: fee,
          matchDates,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't save changes.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this tournament? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Couldn't delete the tournament.");
        return;
      }
      router.push("/tournaments");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          ✏️ Edit details
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
        >
          🗑️ Delete
        </button>
        {error && <p className="w-full text-sm text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <label className="mb-1 block text-xs text-white/50">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/50">Venue</label>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">
            Entry fee (₹)
          </label>
          <input
            type="number"
            min={0}
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">Match dates</label>
        <div className="space-y-2">
          {dates.map((d, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="date"
                value={d}
                onChange={(e) => updateDate(i, e.target.value)}
                className={`${inputClass} [color-scheme:dark]`}
              />
              {dates.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setDates((x) => x.filter((_, idx) => idx !== i))
                  }
                  aria-label="Remove date"
                  className="shrink-0 rounded-xl border border-white/10 px-3 text-white/60 transition hover:bg-white/10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDates((d) => [...d, ""])}
          className="mt-2 text-sm font-medium text-emerald-300/80 transition hover:text-emerald-200"
        >
          + Add date
        </button>
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
