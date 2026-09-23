import crypto from "node:crypto";
import {
  addBadmintonPoint,
  createBadmintonScoreState,
  undoBadmintonPoint,
  type BadmintonEventType,
  type BadmintonParticipant,
  type BadmintonPointEvent,
  type BadmintonRules,
  type BadmintonScoreState,
  DEFAULT_BADMINTON_RULES,
} from "./badminton-scoring";
import { readStoredArray, writeStoredArray } from "./mongo";

export type BadmintonFormat = "knockout" | "round-robin" | "group-knockout";
export type BadmintonStatus = "draft" | "registration-open" | "registration-closed" | "in-progress" | "completed" | "cancelled";
export interface BadmintonPlayer { id: string; name: string; gender?: string; club?: string; ranking?: number; }
export interface BadmintonPair { id: string; name: string; playerIds: string[]; }
export interface BadmintonEvent { id: string; name: string; type: BadmintonEventType; rules: BadmintonRules; participantIds: string[]; }
export interface BadmintonMatch {
  id: string; eventId: string; round: string; matchNumber: number;
  participant1?: BadmintonParticipant; participant2?: BadmintonParticipant;
  status: "scheduled" | "ready" | "live" | "completed" | "walkover" | "retired" | "cancelled" | "postponed";
  court?: string; scheduledAt?: string; winnerId?: string; score: BadmintonScoreState;
}
export interface BadmintonAudit { id: string; userId: string; action: string; at: string; previous?: unknown; next?: unknown; }
export interface BadmintonTournament {
  id: string; name: string; description?: string; location?: string; venue?: string;
  startDate: string; endDate: string; registrationDeadline: string; contact?: string;
  visibility: "public" | "private"; status: BadmintonStatus; format: BadmintonFormat;
  organizerId: string; organizerName: string; logo?: string; banner?: string;
  scorerIds: string[]; players: BadmintonPlayer[]; pairs: BadmintonPair[]; events: BadmintonEvent[]; matches: BadmintonMatch[]; audit: BadmintonAudit[]; createdAt: string;
}

async function readAll(): Promise<BadmintonTournament[]> {
  const tournaments = await readStoredArray<BadmintonTournament>("badminton", "badminton.json");
    return tournaments.map((tournament) => {
      const legacy = tournament as BadmintonTournament & { eventTypes?: BadmintonEventType[] };
      const eventTypes = legacy.eventTypes ?? [];
      const eventLabels: Record<string, string> = { "mens-singles": "Men's Singles", "womens-singles": "Women's Singles", "mens-doubles": "Men's Doubles", "womens-doubles": "Women's Doubles", "mixed-doubles": "Mixed Doubles" };
      const events = tournament.events?.length ? tournament.events : eventTypes.map((type, index) => ({ id: `BE-${String(index + 1).padStart(3, "0")}`, name: eventLabels[type] ?? type, type, rules: DEFAULT_BADMINTON_RULES, participantIds: [] }));
      return {
      ...tournament,
      scorerIds: [...new Set([tournament.organizerId, ...(tournament.scorerIds ?? [])])],
      events,
      // Older UI versions allowed blank IDs and phone numbers here. Shared player IDs are SMPL IDs.
      players: (tournament.players ?? []).filter((player) => /^SMPL-[A-Z]\d{3}$/.test(player.id) && player.name.trim().length > 0),
      };
    });
}
async function writeAll(items: BadmintonTournament[]) { await writeStoredArray("badminton", "badminton.json", items); }
function nextId(prefix: string, ids: string[]): string { const max = ids.reduce((value, id) => Math.max(value, Number(id.split("-").pop()) || 0), 0); return `${prefix}-${String(max + 1).padStart(3, "0")}`; }
function audit(t: BadmintonTournament, userId: string, action: string, previous?: unknown, next?: unknown) { t.audit.push({ id: crypto.randomUUID(), userId, action, at: new Date().toISOString(), previous, next }); }

export async function listBadmintonTournaments(): Promise<BadmintonTournament[]> { return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export async function getBadmintonTournament(id: string) { return (await readAll()).find((item) => item.id === id); }
export async function createBadmintonTournament(input: Omit<BadmintonTournament, "id" | "scorerIds" | "players" | "pairs" | "events" | "matches" | "audit" | "createdAt" | "status"> & { organizerId: string; organizerName: string; eventTypes?: BadmintonEventType[] }): Promise<BadmintonTournament> {
  const items = await readAll();
  const eventTypes = input.eventTypes ?? [];
  const eventLabels: Record<string, string> = { "mens-singles": "Men's Singles", "womens-singles": "Women's Singles", "mens-doubles": "Men's Doubles", "womens-doubles": "Women's Doubles", "mixed-doubles": "Mixed Doubles" };
  const events = eventTypes.map((type, index) => ({ id: `BE-${String(index + 1).padStart(3, "0")}`, name: eventLabels[type] ?? type, type, rules: DEFAULT_BADMINTON_RULES, participantIds: [] }));
  const { eventTypes: _, ...tournamentInput } = input;
  const tournament: BadmintonTournament = { ...tournamentInput, id: nextId("BT", items.map((item) => item.id)), status: "draft", scorerIds: [input.organizerId], players: [], pairs: [], events, matches: [], audit: [], createdAt: new Date().toISOString() };
  audit(tournament, input.organizerId, "tournament.created"); items.push(tournament); await writeAll(items); return tournament;
}
export function canManageBadminton(t: Pick<BadmintonTournament, "organizerId">, user: { id: string; isAdmin: boolean }) { return user.isAdmin || t.organizerId === user.id; }
export function canScoreBadminton(t: Pick<BadmintonTournament, "organizerId" | "scorerIds">, user: { id: string; isAdmin: boolean }) { return user.isAdmin || t.organizerId === user.id || t.scorerIds.includes(user.id); }

export async function assignBadmintonScorer(id: string, scorerId: string, userId: string) {
  const items = await readAll(); const t = items.find((item) => item.id === id); if (!t) return undefined;
  if (!t.scorerIds.includes(scorerId)) t.scorerIds.push(scorerId);
  audit(t, userId, "scorer.assigned", undefined, { scorerId }); await writeAll(items); return t;
}

export async function addBadmintonEvent(id: string, event: Omit<BadmintonEvent, "id" | "participantIds">, userId: string) {
  const items = await readAll(); const t = items.find((item) => item.id === id); if (!t) return undefined;
  const next = { ...event, id: nextId("BE", t.events.map((item) => item.id)), participantIds: [] }; t.events.push(next); audit(t, userId, "event.created", undefined, next); await writeAll(items); return t;
}
export async function registerBadmintonPlayer(id: string, player: BadmintonPlayer, userId: string) {
  const items = await readAll(); const t = items.find((item) => item.id === id); if (!t) return undefined;
  if (!/^SMPL-[A-Z]\d{3}$/.test(player.id) || !player.name.trim()) throw new Error("Choose a registered player from the list");
  if (!t.players.some((item) => item.id === player.id)) t.players.push(player); audit(t, userId, "player.registered", undefined, player); await writeAll(items); return t;
}
export async function createBadmintonPair(id: string, pair: Omit<BadmintonPair, "id">, userId: string) {
  const items = await readAll(); const t = items.find((item) => item.id === id); if (!t) return undefined;
  if (pair.playerIds.length !== 2 || new Set(pair.playerIds).size !== 2) throw new Error("A doubles pair needs two different players");
  const next = { ...pair, id: nextId("BP", t.pairs.map((item) => item.id)) }; t.pairs.push(next); audit(t, userId, "pair.created", undefined, next); await writeAll(items); return t;
}

export async function generateBadmintonDraw(id: string, eventId: string, participantIds: string[], userId: string) {
  const items = await readAll(); const t = items.find((item) => item.id === id); const event = t?.events.find((item) => item.id === eventId); if (!t || !event) return undefined;
  if (t.matches.some((match) => match.eventId === eventId)) throw new Error("This draw already exists");
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(2, participantIds.length)))); const roundCount = Math.log2(size); const ids = [...participantIds]; while (ids.length < size) ids.push("");
  event.participantIds = participantIds;
  for (let round = 0; round < roundCount; round += 1) {
    const count = size / 2 ** (round + 1); const name = round === roundCount - 1 ? "Final" : round === roundCount - 2 ? "Semi Final" : round === roundCount - 3 ? "Quarter Final" : `Round of ${size / 2 ** round}`;
    for (let n = 0; n < count; n += 1) {
      const p1 = round === 0 ? ids[n * 2] : undefined; const p2 = round === 0 ? ids[n * 2 + 1] : undefined;
      const resolve = (participantId?: string): BadmintonParticipant | undefined => participantId ? (t.players.find((p) => p.id === participantId) ?? t.pairs.find((p) => p.id === participantId) as BadmintonParticipant | undefined) : undefined;
      const a = resolve(p1); const b = resolve(p2); const score = createBadmintonScoreState(a ?? { id: `pending-${n}`, name: "TBD" }, b ?? { id: `pending-${n}-b`, name: "TBD" }, event.rules);
      t.matches.push({ id: nextId("BM", t.matches.map((item) => item.id)), eventId, round: name, matchNumber: n + 1, participant1: a, participant2: b, status: a && b ? "scheduled" : "ready", score });
    }
  }
  const firstRound = t.matches.filter((match) => match.eventId === eventId && match.round === t.matches.find((item) => item.eventId === eventId)?.round);
  for (const match of firstRound) {
    const winner = match.participant1 ?? match.participant2;
    if (winner && (!match.participant1 || !match.participant2)) {
      match.status = "walkover";
      match.winnerId = winner.id;
      const nextMatch = t.matches.find((item) => item.eventId === eventId && item.round !== match.round && item.status !== "completed" && item.status !== "walkover" && (!item.participant1 || !item.participant2));
      if (nextMatch) {
        if (!nextMatch.participant1) nextMatch.participant1 = winner;
        else nextMatch.participant2 = winner;
        nextMatch.status = nextMatch.participant1 && nextMatch.participant2 ? "scheduled" : "ready";
        nextMatch.score = createBadmintonScoreState(nextMatch.participant1 ?? { id: `pending-${nextMatch.id}-1`, name: "TBD" }, nextMatch.participant2 ?? { id: `pending-${nextMatch.id}-2`, name: "TBD" }, event.rules);
      }
    }
  }
  audit(t, userId, "draw.generated", undefined, { eventId, participantIds }); await writeAll(items); return t;
}

export async function addBadmintonPointToMatch(id: string, winnerId: string, userId: string) { return mutateMatch(id, userId, (match) => { match.score = addBadmintonPoint(match.score, winnerId); match.status = match.score.status === "completed" ? "completed" : "live"; match.winnerId = match.score.winnerId; }); }
export async function undoBadmintonMatchPoint(id: string, userId: string) { return mutateMatch(id, userId, (match) => { match.score = undoBadmintonPoint(match.score); match.status = match.score.status === "scheduled" ? "ready" : "live"; match.winnerId = undefined; }); }
async function mutateMatch(id: string, userId: string, change: (match: BadmintonMatch) => void) {
  const items = await readAll();
  for (const t of items) {
    const match = t.matches.find((item) => item.id === id);
    if (!match) continue;
    const previous = match.score;
    change(match);
    if (match.status === "completed" && match.winnerId) {
      const nextMatch = t.matches.find((item) => item.eventId === match.eventId && item.round !== match.round && item.status !== "completed" && item.status !== "walkover" && (!item.participant1 || !item.participant2));
      const winner = match.participant1?.id === match.winnerId ? match.participant1 : match.participant2;
      if (nextMatch && winner) {
        if (!nextMatch.participant1) nextMatch.participant1 = winner;
        else if (!nextMatch.participant2) nextMatch.participant2 = winner;
        if (!nextMatch.participant1 || !nextMatch.participant2) continue;
        nextMatch.score = createBadmintonScoreState(nextMatch.participant1, nextMatch.participant2, nextMatch.score.rules);
        nextMatch.status = nextMatch.participant1 && nextMatch.participant2 ? "scheduled" : "ready";
        audit(t, userId, "match.winner.advanced", undefined, { from: match.id, to: nextMatch.id, winnerId: winner.id });
      }
    }
    audit(t, userId, "match.score.updated", previous, match.score);
    await writeAll(items);
    return { tournament: t, match };
  }
  return undefined;
}

export function standings(t: BadmintonTournament, eventId: string) {
  const rows = new Map<string, { id: string; name: string; played: number; won: number; lost: number; gamesWon: number; gamesLost: number; pointsWon: number; pointsLost: number }>();
  for (const match of t.matches.filter((item) => item.eventId === eventId && item.status === "completed")) {
    for (const p of [match.participant1, match.participant2]) if (p) rows.set(p.id, rows.get(p.id) ?? { id: p.id, name: p.name, played: 0, won: 0, lost: 0, gamesWon: 0, gamesLost: 0, pointsWon: 0, pointsLost: 0 });
    if (!match.winnerId || !match.participant1 || !match.participant2) continue;
    const first = rows.get(match.participant1.id)!; const second = rows.get(match.participant2.id)!; first.played += 1; second.played += 1; if (match.winnerId === first.id) { first.won += 1; second.lost += 1; } else { second.won += 1; first.lost += 1; }
    for (const game of match.score.games) { first.pointsWon += game.participant1; first.pointsLost += game.participant2; second.pointsWon += game.participant2; second.pointsLost += game.participant1; if (game.winnerId === first.id) first.gamesWon += 1; if (game.winnerId === second.id) second.gamesWon += 1; }
  }
  return [...rows.values()].sort((a, b) => b.won - a.won || (b.pointsWon - b.pointsLost) - (a.pointsWon - a.pointsLost));
}