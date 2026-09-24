"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ScorerEntry = { userId: string; name: string; mobile: string };

const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const buttonClass = "rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-50";

/** Lets an owner/organizer/admin grant or revoke the Scorer role, either for a
 * single match or for every match in a tournament. */
export function ManageScorers({
  endpoint,
  scorers,
}: {
  endpoint: string;
  scorers: ScorerEntry[];
}) {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addScorer() {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Couldn't add the scorer.");
        return;
      }
      setMobile("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeScorer(userId: string) {
    setRemoving(userId);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Couldn't remove the scorer.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/50">
        Scorers can record deliveries and score matches without owning or organizing them.
      </p>
      {scorers.length === 0 ? (
        <p className="text-sm text-white/40">No scorers assigned yet.</p>
      ) : (
        <ul className="space-y-2">
          {scorers.map((scorer) => (
            <li key={scorer.userId} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="text-white">{scorer.name} <span className="text-white/40">· {scorer.mobile}</span></span>
              <button
                type="button"
                onClick={() => removeScorer(scorer.userId)}
                disabled={removing !== null}
                className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
              >
                {removing === scorer.userId ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={mobile}
          onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Scorer's 10-digit mobile number"
          inputMode="numeric"
          className={inputClass}
        />
        <button type="button" onClick={addScorer} disabled={busy || !mobile} className={buttonClass}>
          {busy ? "Adding…" : "Add scorer"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
