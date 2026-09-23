"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BadmintonTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [courtCount, setCourtCount] = useState(2);
  const [bestOf, setBestOf] = useState(3);
  const [pointsToWin, setPointsToWin] = useState(21);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/badminton/tournaments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          venue: venue || undefined,
          courtCount: parseInt(courtCount.toString()),
          bestOf: Math.max(1, Math.min(15, Number.isFinite(bestOf) ? bestOf : 3)),
          pointsToWin: Math.max(5, Math.min(99, Number.isFinite(pointsToWin) ? pointsToWin : 21)),
        }),
      });

      const data = await response.json();
      setSaving(false);

      if (!response.ok) {
        setError(data.error ?? data.errors?.join(", ") ?? "Could not create tournament");
        return;
      }

      router.push(`/badminton/${data.id}`);
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <label className="block text-sm text-white/70">
          Tournament name <span className="text-rose-300">*</span>
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-emerald-400/50"
          placeholder="City Badminton League 2025"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-emerald-400/50"
          placeholder="Optional tournament details..."
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm text-white/70">Venue</label>
        <input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          maxLength={100}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-emerald-400/50"
          placeholder="e.g., Sports Complex - Hall A"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70">
          Number of Courts <span className="text-rose-300">*</span>
        </label>
        <div className="mt-2 flex gap-2">
          {[1, 2, 4, 8, 16].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setCourtCount(count)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                courtCount === count
                  ? "bg-emerald-400 text-emerald-950"
                  : "border border-white/10 bg-white/5 text-white hover:border-emerald-400/50"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/50">
          You can have {courtCount} simultaneous matches running in parallel
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-white/70">Games per match (best of)</label>
          <input
            type="number"
            min={1}
            max={15}
            value={Number.isNaN(bestOf) ? "" : bestOf}
            onChange={(e) => setBestOf(e.target.valueAsNumber)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-emerald-400/50"
          />
          <p className="mt-1 text-xs text-white/50">
            Default 3 — win {Number.isFinite(bestOf) ? Math.ceil(bestOf / 2) : 2} game
            {(Number.isFinite(bestOf) ? Math.ceil(bestOf / 2) : 2) === 1 ? "" : "s"} to take the match
          </p>
        </div>
        <div>
          <label className="block text-sm text-white/70">Points to win a game</label>
          <input
            type="number"
            min={5}
            max={99}
            value={Number.isNaN(pointsToWin) ? "" : pointsToWin}
            onChange={(e) => setPointsToWin(e.target.valueAsNumber)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-emerald-400/50"
          />
          <p className="mt-1 text-xs text-white/50">
            Default 21 — must win by 2, capped at {(Number.isFinite(pointsToWin) ? pointsToWin : 21) + 9}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <button
        disabled={saving || !name.trim()}
        className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 font-semibold text-emerald-950 disabled:opacity-50 transition hover:bg-emerald-300"
      >
        {saving ? "Creating tournament..." : "Create tournament"}
      </button>
    </form>
  );
}
