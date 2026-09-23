"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentCard } from "@/components/PaymentCard";

type Props = {
  sport: "cricket" | "badminton";
  tournamentId: string;
  tournamentName: string;
  organizerName: string;
  details?: string;
  entryFee?: number;
  tournamentHref: string;
  joined: boolean;
  signedIn: boolean;
};

export function PublicTournamentJoin({
  sport,
  tournamentId,
  tournamentName,
  organizerName,
  details,
  entryFee = 0,
  tournamentHref,
  joined,
  signedIn,
}: Props) {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = `/join/${sport}/${tournamentId}`;
  const paid = entryFee > 0;

  async function join() {
    if (paid && transactionId.trim().length < 6) {
      setError("Enter the UPI transaction reference after paying.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const endpoint =
        sport === "cricket"
          ? `/api/tournaments/${tournamentId}/join`
          : `/api/badminton/tournaments/${tournamentId}/join`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sport === "cricket" && paid ? { transactionId: transactionId.trim() } : {}),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok && response.status !== 409) {
        setError(data.error ?? "Couldn't join this tournament.");
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
    <main className="min-h-dvh bg-[var(--page-bg)] px-4 py-10 text-white">
      <section className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
        <p className="text-sm font-medium text-emerald-300">{sport === "cricket" ? "🏏 Cricket" : "🏸 Badminton"} tournament invitation</p>
        <h1 className="mt-2 text-3xl font-bold">{tournamentName}</h1>
        <p className="mt-2 text-sm text-white/60">Organised by {organizerName}</p>
        {details && <p className="mt-5 whitespace-pre-line text-sm text-white/75">{details}</p>}

        <div className="mt-6 border-t border-white/10 pt-5">
          {!signedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-white/70">Create an account or sign in, then you can join this tournament.</p>
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="block rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-emerald-950">
                Sign in to join
              </Link>
              <Link href={`/?next=${encodeURIComponent(next)}`} className="block rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white/85">
                Create account & join
              </Link>
            </div>
          ) : joined ? (
            <div className="space-y-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm font-medium text-emerald-200">
              <p>You&apos;ve joined this tournament.</p>
              <div className="flex flex-wrap gap-2">
                <Link href={tournamentHref} className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950">
                  Open tournament
                </Link>
                {sport === "cricket" && (
                  <Link href={`${tournamentHref}/teams/new`} className="rounded-lg border border-emerald-400/30 px-3 py-2 text-sm font-semibold text-emerald-100">
                    Create a team
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {paid ? (
                <>
                  <PaymentCard amount={entryFee} note={`Entry: ${tournamentName}`} title="Pay entry fee" />
                  <input
                    value={transactionId}
                    onChange={(event) => setTransactionId(event.target.value)}
                    placeholder="UPI transaction / UTR ID"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  />
                </>
              ) : (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">This tournament is free to join.</p>
              )}
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <button type="button" disabled={busy} onClick={join} className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-50">
                {busy ? "Joining..." : paid ? "Confirm payment & join" : "Join tournament"}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}