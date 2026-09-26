"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "./LoadingOverlay";
import { appConfig } from "@/lib/config";

type Option = { id: string; name: string; playerType?: string };
const input = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/60";

export function AuctionCreateForm({ players, teams }: { players: Option[]; teams: Option[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [purse, setPurse] = useState("10000000");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) { setter((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch("/api/auctions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, purse: Number(purse), teamIds, playerIds }) });
      const data = (await response.json()) as { error?: string; auction?: { id: string } };
      if (!response.ok || !data.auction) { setError(data.error ?? "Could not create auction."); return; }
      router.push(`/auctions/${data.auction.id}`);
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  }
  const visiblePlayers = players.filter((player) => `${player.name} ${player.playerType ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <><form onSubmit={submit} className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-emerald-100/80">Auction name<input value={name} onChange={(event) => setName(event.target.value)} placeholder={`${appConfig.leagueName} Premier Auction`} className={`${input} mt-1.5`} /></label><label className="text-sm font-medium text-emerald-100/80">Purse per team (₹)<input type="number" min={1000} step={1000} value={purse} onChange={(event) => setPurse(event.target.value)} className={`${input} mt-1.5`} /></label></div><section><h2 className="mb-2 font-semibold">Registered teams</h2><div className="grid gap-2 sm:grid-cols-2">{teams.map((team) => <label key={team.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><input type="checkbox" checked={teamIds.includes(team.id)} onChange={() => toggle(setTeamIds, team.id)} className="accent-emerald-400" /><span>{team.name}</span></label>)}</div></section><section><div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold">Registered players</h2><span className="text-xs text-white/40">{playerIds.length} selected</span></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" className={`${input} mb-2`} /><div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">{visiblePlayers.map((player) => <label key={player.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><input type="checkbox" checked={playerIds.includes(player.id)} onChange={() => toggle(setPlayerIds, player.id)} className="accent-emerald-400" /><span><span className="block">{player.name}</span><span className="text-xs text-white/40">{player.playerType}</span></span></label>)}</div></section>{error && <p className="text-sm text-rose-400">{error}</p>}<button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 font-semibold text-emerald-950 disabled:opacity-50">{busy ? "Creating…" : "Create auction room"}</button></form>{busy && <LoadingOverlay message="Opening auction room…" />}</>;
}
