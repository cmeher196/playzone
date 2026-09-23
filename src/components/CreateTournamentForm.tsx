"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";
const errorClass = "mt-1.5 text-sm text-rose-400";
const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-400/20";

export function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [dates, setDates] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateDate(index: number, value: string) {
    setDates((d) => d.map((x, i) => (i === index ? value : x)));
  }
  function addDate() {
    setDates((d) => [...d, ""]);
  }
  function removeDate(index: number) {
    setDates((d) => (d.length > 1 ? d.filter((_, i) => i !== index) : d));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const matchDates = dates.map((d) => d.trim()).filter(Boolean);
    if (name.trim().length < 3) {
      setError("Give your tournament a name (3+ characters).");
      return;
    }
    if (matchDates.length === 0) {
      setError("Add at least one match date.");
      return;
    }
    const fee = Number(entryFee || 0);
    if (!Number.isFinite(fee) || fee < 0) {
      setError("Enter a valid entry fee.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          venue: venue.trim() || undefined,
          entryFee: fee,
          matchDates,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        tournament?: { id: string };
      };
      if (!res.ok || !data.tournament) {
        setError(data.error ?? "Couldn't create the tournament.");
        return;
      }
      router.push(`/tournaments/${data.tournament.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div>
        <label htmlFor="name" className={labelClass}>
          Tournament name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunday Super League"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="venue" className={labelClass}>
          Venue <span className="text-white/40">(optional)</span>
        </label>
        <input
          id="venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="e.g. City Sports Ground"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="entryFee" className={labelClass}>
          Entry fee (₹)
        </label>
        <input
          id="entryFee"
          type="number"
          inputMode="numeric"
          min={0}
          value={entryFee}
          onChange={(e) => setEntryFee(e.target.value)}
          placeholder="0 for free"
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>Match dates</span>
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
                  onClick={() => removeDate(i)}
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
          onClick={addDate}
          className="mt-2 text-sm font-medium text-emerald-300/80 transition hover:text-emerald-200"
        >
          + Add another date
        </button>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description <span className="text-white/40">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Format, overs, rules, contact…"
          className={`${inputClass} resize-y`}
        />
      </div>

      {error && <p className={errorClass}>{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create tournament"}
      </button>
    </form>
  );
}
