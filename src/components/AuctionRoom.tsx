"use client";

import { useEffect, useState } from "react";
import type { Auction } from "@/lib/auctions";

const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const button = "rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

export function AuctionRoom({ initial, canControl }: { initial: Auction; canControl: boolean }) {
  const [auction, setAuction] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = auction.players.find((player) => player.id === auction.currentPlayerId);
  const currentTeam = auction.teams.find((team) => team.id === auction.currentBidTeamId);

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auctions/${auction.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as { error?: string; auction?: Auction };
      if (!response.ok || !data.auction) {
        setError(data.error ?? "Auction action failed.");
        return;
      }
      setAuction(data.auction);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/auctions/${auction.id}`, { cache: "no-store" });
        const data = (await response.json()) as { auction?: Auction };
        if (data.auction) setAuction(data.auction);
      } catch {
        // Keep the last known board during transient network failures.
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [auction.id]);

  const pending = auction.players.filter((player) => player.status === "pending").length;
  const unsold = auction.players.filter((player) => player.status === "unsold").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{auction.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            Round {auction.round} · {auction.status} · {pending} pending · {unsold} unsold
          </p>
        </div>
        {canControl && (
          <div className="flex gap-2">
            {!current && auction.status !== "completed" && (
              <button disabled={busy} onClick={() => call("start")} className={`${button} bg-emerald-500 text-emerald-950`}>
                {pending || unsold ? "Bring next player" : "Finish auction"}
              </button>
            )}
            {current && (
              <>
                <button disabled={busy} onClick={() => call("settle", { result: "sold" })} className={`${button} bg-emerald-500 text-emerald-950`}>Sold</button>
                <button disabled={busy} onClick={() => call("settle", { result: "unsold" })} className={`${button} bg-amber-400 text-amber-950`}>Pass / Unsold</button>
              </>
            )}
          </div>
        )}
      </header>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

      {current ? (
        <section className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-400/15 to-transparent p-6">
          <div className="text-xs uppercase tracking-widest text-amber-200/70">Current player · {current.category}</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black text-white">{current.name}</h2>
              <p className="mt-2 text-white/60">Base price {money(current.basePrice)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/50">Current bid</p>
              <p className="text-4xl font-black text-amber-200">{money(auction.currentBid ?? current.basePrice)}</p>
              <p className="text-sm text-white/60">{currentTeam ? `${currentTeam.name} is leading` : "Opening bid"}</p>
            </div>
          </div>
          {canControl && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {auction.teams.map((team) => {
                const nextBid = auction.currentBid === undefined ? current.basePrice : auction.currentBid + 1000;
                const isLeadingTeam = team.id === auction.currentBidTeamId;
                return (
                  <button
                    key={team.id}
                    disabled={busy || isLeadingTeam || team.purse < nextBid}
                    onClick={() => call("bid", { teamId: team.id, amount: nextBid })}
                    className={`${button} flex items-center justify-between border border-white/10 bg-white/10 text-white hover:bg-white/15`}
                  >
                    <span>{team.name}{isLeadingTeam ? " · Leading" : ""}</span>
                    <span>{money(team.purse)} · Bid {money(nextBid)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
          {auction.status === "completed" ? "Auction completed." : "Start the auction to bring the first player into the room."}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Team purses and squads</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {auction.teams.map((team) => (
            <div key={team.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between"><h3 className="font-semibold">{team.name}</h3><span className="text-emerald-300">{money(team.purse)}</span></div>
              <p className="mt-1 text-xs text-white/40">Spent {money(team.initialPurse - team.purse)} · {team.players.length} bought</p>
              <div className="mt-3 space-y-1 text-sm text-white/70">
                {team.players.length ? team.players.map((player) => <div key={player.playerId} className="flex justify-between"><span>{player.name}</span><span>{money(player.price)}</span></div>) : <span className="text-white/30">No players yet</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Auction pool</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {auction.players.map((player) => (
            <div key={player.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span><span className="block text-sm">{player.name}</span><span className="text-xs text-white/40">{player.category} · base {money(player.basePrice)}</span></span>
              <span className={`text-xs font-semibold ${player.status === "sold" ? "text-emerald-300" : player.status === "unsold" ? "text-amber-300" : player.status === "current" ? "text-sky-300" : "text-white/40"}`}>
                {player.status === "sold" ? `Sold ${money(player.soldPrice ?? 0)}` : player.status}
              </span>
            </div>
          ))}
        </div>
      </section>
      <p className="text-xs text-white/35">Organizer: {auction.ownerName}. The board refreshes automatically for viewers.</p>
    </div>
  );
}
