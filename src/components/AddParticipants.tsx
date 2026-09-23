"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface PlayerOption {
  id: string;
  name: string;
  mobile: string;
  playerType: string;
}

export function AddParticipants({
  tournamentId,
  available,
}: {
  tournamentId: string;
  available: PlayerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? available.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.mobile.includes(query.trim()),
        )
      : available;
  }, [available, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filtered) next.add(p.id);
      return next;
    });
  }

  async function add() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: [...selected] }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't add players.");
        return;
      }
      setSelected(new Set());
      setOpen(false);
      setQuery("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-white/40">
        Every registered player is already in this tournament.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
      >
        + Add players ({available.length} available)
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by player name or mobile number…"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60"
      />
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
        <button
          type="button"
          onClick={selectAllFiltered}
          className="text-emerald-300 hover:text-emerald-200"
        >
          Select all{query ? " (filtered)" : ""}
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="hover:text-white/80"
        >
          Clear
        </button>
        <span className="ml-auto">{selected.size} selected</span>
      </div>

      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
        {filtered.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white/5">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span className="text-white">{p.name}</span>
              <span className="ml-auto text-right text-xs text-white/40">
                <span className="block">{p.mobile}</span>
                <span className="block">{p.playerType}</span>
              </span>
            </label>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-2 py-3 text-center text-sm text-white/40">
            No players match “{query}”.
          </li>
        )}
      </ul>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={add}
          disabled={busy || selected.size === 0}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50"
        >
          {busy
            ? "Adding…"
            : `Add ${selected.size} player${selected.size === 1 ? "" : "s"}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSelected(new Set());
            setQuery("");
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
