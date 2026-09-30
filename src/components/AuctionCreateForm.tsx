"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "./LoadingOverlay";
import { appConfig } from "@/lib/config";

type TournamentOption = { id: string; name: string };
const input = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/60";

/**
 * Auction creation only captures the basics — name, purse/team, default
 * base price, and optionally when it's happening and which tournament it's
 * dedicated to. Teams and players are no longer picked here: players
 * self-register and the owner adds teams once the auction exists (see the
 * registration section on the auction's own page).
 */
export function AuctionCreateForm({ tournaments }: { tournaments: TournamentOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [purse, setPurse] = useState("10000000");
  const [defaultBasePrice, setDefaultBasePrice] = useState("1000000");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          purse: Number(purse),
          defaultBasePrice: Number(defaultBasePrice),
          date: date || undefined,
          time: time || undefined,
          tournamentId: tournamentId || undefined,
          venue: venue || undefined,
          description: description || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; auction?: { id: string } };
      if (!response.ok || !data.auction) {
        setError(data.error ?? "Could not create auction.");
        return;
      }
      router.push(`/auctions/${data.auction.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const tournamentName = tournaments.find((tournament) => tournament.id === tournamentId)?.name;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form onSubmit={submit} className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-emerald-100/80">
              Auction name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={`${appConfig.leagueName} Premier Auction`}
                className={`${input} mt-1.5`}
              />
            </label>
            <label className="text-sm font-medium text-emerald-100/80">
              Link to a tournament <span className="text-white/40">(optional)</span>
              <select value={tournamentId} onChange={(event) => setTournamentId(event.target.value)} className={`${input} mt-1.5`}>
                <option value="" className="bg-[#0a1712]">None</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id} className="bg-[#0a1712]">
                    {tournament.name}
                  </option>
                ))}
              </select>
              {tournaments.length === 0 && (
                <span className="mt-1 block text-xs font-normal text-white/40">You don&apos;t organize any tournaments yet.</span>
              )}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-emerald-100/80">
              Auction date <span className="text-white/40">(optional)</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${input} mt-1.5 [color-scheme:dark]`} />
            </label>
            <label className="text-sm font-medium text-emerald-100/80">
              Start time <span className="text-white/40">(optional)</span>
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={`${input} mt-1.5 [color-scheme:dark]`} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-emerald-100/80">
              Venue / Online <span className="text-white/40">(optional)</span>
              <input
                value={venue}
                onChange={(event) => setVenue(event.target.value)}
                placeholder="Online, or a venue name"
                className={`${input} mt-1.5`}
              />
            </label>
            <label className="text-sm font-medium text-emerald-100/80">
              Description <span className="text-white/40">(optional)</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Player auction for this tournament"
                className={`${input} mt-1.5`}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-emerald-100/80">
              Purse per team (₹)
              <input type="number" min={1000} step={1000} value={purse} onChange={(event) => setPurse(event.target.value)} className={`${input} mt-1.5`} />
            </label>
            <label className="text-sm font-medium text-emerald-100/80">
              Default base price (₹)
              <input
                type="number"
                min={1}
                step={1}
                value={defaultBasePrice}
                onChange={(event) => setDefaultBasePrice(event.target.value)}
                className={`${input} mt-1.5`}
              />
              <span className="mt-1 block text-xs font-normal text-white/40">Given to every player when they register. Any amount.</span>
            </label>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create auction"}
          </button>
        </form>

        <aside className="h-fit space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-emerald-100/80">Quick Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-white/50">Tournament</dt><dd className="text-right text-white">{tournamentName ?? "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-white/50">Date</dt><dd className="text-right text-white">{date || "—"}{time ? ` · ${time}` : ""}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-white/50">Venue</dt><dd className="text-right text-white">{venue || "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-white/50">Purse / team</dt><dd className="text-right text-white">₹{Number(purse || 0).toLocaleString("en-IN")}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-white/50">Base price</dt><dd className="text-right text-white">₹{Number(defaultBasePrice || 0).toLocaleString("en-IN")}</dd></div>
          </dl>
          <p className="border-t border-white/10 pt-3 text-xs text-white/40">
            Teams and players aren&apos;t picked here — teams are added by you, and players register themselves, once the auction is created.
          </p>
        </aside>
      </div>
      {busy && <LoadingOverlay message="Creating auction…" />}
    </>
  );
}
