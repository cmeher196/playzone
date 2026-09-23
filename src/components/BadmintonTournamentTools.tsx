"use client";

import { useState } from "react";

type RegisteredPlayer = { id: string; name: string; gender: string };
type EventType = "mens-singles" | "womens-singles" | "mens-doubles" | "womens-doubles" | "mixed-doubles";

export function BadmintonTournamentTools({ tournamentId, eventId, playerIds, scorerIds, registeredPlayers }: { tournamentId: string; eventId?: string; playerIds: string[]; scorerIds: string[]; registeredPlayers: RegisteredPlayer[] }) {
  const [playerId, setPlayerId] = useState("");
  const [eventName, setEventName] = useState("Men's Singles");
  const [eventType, setEventType] = useState<EventType>("mens-singles");
  const [message, setMessage] = useState("");

  async function send(body: object) {
    const response = await fetch(`/api/badminton/${tournamentId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setMessage(response.ok ? "Saved" : data.error ?? "Request failed");
    if (response.ok) window.location.reload();
  }

  const selected = registeredPlayers.find((player) => player.id === playerId);
  const addedPlayers = playerIds.map((id) => registeredPlayers.find((player) => player.id === id)).filter((player): player is RegisteredPlayer => Boolean(player));

  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Organizer tools</h2><p className="mt-1 text-xs text-white/45">Add people from the shared player directory, then create the draw.</p></div><span className="rounded-full bg-orange-300/10 px-2.5 py-1 text-xs text-orange-200">{addedPlayers.length} added</span></div>
    {addedPlayers.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{addedPlayers.map((player) => <span key={player.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75">{player.name}</span>)}</div>}
    <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_auto]"><select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="rounded-xl border border-white/10 bg-[var(--surface-solid)] px-3 py-2.5 text-sm text-white"><option value="">Choose a registered player</option>{registeredPlayers.filter((player) => !playerIds.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.name} · {player.id}</option>)}</select><button disabled={!selected} onClick={() => selected && send({ action: "player", player: selected })} className="rounded-xl bg-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-950 disabled:cursor-not-allowed disabled:opacity-40">Add player</button></div>
    <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1fr_auto]"><input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Event name" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm" /><select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)} className="rounded-xl border border-white/10 bg-[var(--surface-solid)] px-3 py-2.5 text-sm text-white"><option value="mens-singles">Men&apos;s Singles</option><option value="womens-singles">Women&apos;s Singles</option><option value="mens-doubles">Men&apos;s Doubles</option><option value="womens-doubles">Women&apos;s Doubles</option><option value="mixed-doubles">Mixed Doubles</option></select><button onClick={() => send({ action: "event", event: { name: eventName, type: eventType } })} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold">Add event</button></div>
    {eventId && <button disabled={playerIds.length < 2} onClick={() => send({ action: "draw", eventId, participantIds: playerIds })} className="mt-3 rounded-xl bg-emerald-400 px-3 py-2.5 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40">{playerIds.length < 2 ? "Add at least 2 players to draw" : "Generate knockout draw"}</button>}
    <div className="mt-4 border-t border-white/10 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-white/45">Scoring access</p><div className="mt-2 flex gap-3"><select defaultValue="" onChange={(event) => { if (event.target.value) send({ action: "scorer", scorerId: event.target.value }); }} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[var(--surface-solid)] px-3 py-2.5 text-sm text-white"><option value="">Assign a scorer from registered users</option>{registeredPlayers.filter((player) => !scorerIds.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.name} · {player.id}</option>)}</select></div><p className="mt-2 text-xs text-white/40">Creator and assigned scorers can score every match. Players do not get scoring access automatically.</p></div>
    {message && <p className="mt-2 text-sm text-white/60">{message}</p>}
  </div>;
}