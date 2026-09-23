"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentCard } from "./PaymentCard";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-400/20";

export function JoinTournament({
  tournamentId,
  tournamentName,
  entryFee,
}: {
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
}) {
  const router = useRouter();
  const [txn, setTxn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = entryFee > 0;

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (paid && txn.trim().length < 6) {
      setError("Enter the UPI reference / UTR after paying.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paid ? { transactionId: txn.trim() } : {}),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't join. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={join} className="space-y-4">
      {paid && (
        <>
          <PaymentCard
            amount={entryFee}
            note={`Entry: ${tournamentName}`}
            title="Pay entry fee"
          />
          <div>
            <label htmlFor="txn" className="mb-1.5 block text-sm font-medium text-emerald-100/80">
              UPI transaction / UTR ID
            </label>
            <input
              id="txn"
              value={txn}
              onChange={(e) => setTxn(e.target.value)}
              placeholder="e.g. 431200987654"
              className={inputClass}
            />
          </div>
        </>
      )}
      {!paid && (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">
          This tournament is free to join.
        </p>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Joining…" : paid ? "Confirm payment & join" : "Join tournament"}
      </button>
    </form>
  );
}
