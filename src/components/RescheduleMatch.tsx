"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RescheduleMatch({ matchId, date, venue }: { matchId: string; date: string; venue?: string }) {
  const router = useRouter();
  const [nextDate, setNextDate] = useState(date);
  const [nextVenue, setNextVenue] = useState(venue ?? "");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: nextDate, venue: nextVenue }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) { setError(data.error ?? "Couldn't reschedule match."); return; }
      setOpen(false);
      router.refresh();
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10">
        Reschedule
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <label className="text-xs text-white/50">Date<input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white [color-scheme:dark]" /></label>
          <label className="text-xs text-white/50">Venue<input value={nextVenue} onChange={(e) => setNextVenue(e.target.value)} className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
          <button type="button" onClick={save} disabled={busy} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 disabled:opacity-50">{busy ? "Saving..." : "Save"}</button>
          {error && <p className="w-full text-xs text-rose-400">{error}</p>}
        </div>
      )}
    </div>
  );
}