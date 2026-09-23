import { readStoredArray, writeStoredArray } from "./mongo";

// JSON-file storage, mirroring the registrations store. Swap for a real DB later.

export interface TournamentParticipant {
  playerId: string;
  name: string;
  transactionId: string;
  joinedAt: string;
}

export interface BattingEntry {
  playerId?: string;
  name: string;
  how: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

export interface BowlingEntry {
  playerId?: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
}

export interface FieldingEntry {
  playerId?: string;
  name: string;
  catches?: number;
  runOuts?: number;
  stumpings?: number;
}

export interface Innings {
  team: string;
  runs: number;
  wickets: number;
  overs: number;
  batting: BattingEntry[];
  bowling: BowlingEntry[];
  fielding?: FieldingEntry[];
}

export type MatchStatus = "completed" | "scheduled" | "live";

export interface Match {
  id: string;
  date: string;
  teamA: string;
  teamB: string;
  status: MatchStatus;
  result?: string;
  playerOfTheMatch?: string;
  innings: Innings[];
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  venue?: string;
  entryFee: number;
  matchDates: string[];
  organizerId: string;
  organizerName: string;
  createdAt: string;
  participants: TournamentParticipant[];
  matches?: Match[];
}

async function readAll(): Promise<Tournament[]> {
  return readStoredArray<Tournament>("tournaments", "tournaments.json");
}

async function writeAll(items: Tournament[]): Promise<void> {
  await writeStoredArray("tournaments", "tournaments.json", items);
}

export async function listTournaments(): Promise<Tournament[]> {
  const items = await readAll();
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTournament(
  id: string,
): Promise<Tournament | undefined> {
  const items = await readAll();
  return items.find((t) => t.id === id);
}

export async function listTournamentsForPlayer(
  playerId: string,
): Promise<Tournament[]> {
  const items = await readAll();
  return items
    .filter((t) => t.participants.some((p) => p.playerId === playerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createTournament(input: {
  name: string;
  description?: string;
  venue?: string;
  entryFee: number;
  matchDates: string[];
  organizerId: string;
  organizerName: string;
}): Promise<Tournament> {
  const items = await readAll();
  const tournament: Tournament = {
    ...input,
    id: nextTournamentId(items),
    createdAt: new Date().toISOString(),
    participants: [],
  };
  items.push(tournament);
  await writeAll(items);
  return tournament;
}

export type JoinResult = Tournament | "not-found" | "already-joined";

export async function joinTournament(
  id: string,
  participant: TournamentParticipant,
): Promise<JoinResult> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) return "not-found";
  if (items[index].participants.some((p) => p.playerId === participant.playerId)) {
    return "already-joined";
  }
  items[index].participants.push(participant);
  await writeAll(items);
  return items[index];
}

// Sequential, human-friendly IDs: T-001, T-002, …
function nextTournamentId(items: Tournament[]): string {
  const max = items.reduce((acc, t) => {
    const match = /^T-(\d+)$/.exec(t.id);
    const n = match ? Number(match[1]) : 0;
    return n > acc ? n : acc;
  }, 0);
  return `T-${String(max + 1).padStart(3, "0")}`;
}

/** The organizer (creator) and any global admin may manage a tournament. */
export function canManageTournament(
  tournament: Pick<Tournament, "organizerId">,
  user: { id: string; isAdmin: boolean },
): boolean {
  return user.isAdmin || tournament.organizerId === user.id;
}

export async function updateTournament(
  id: string,
  patch: Partial<
    Pick<Tournament, "name" | "description" | "venue" | "entryFee" | "matchDates">
  >,
): Promise<Tournament | undefined> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...patch };
  await writeAll(items);
  return items[index];
}

export async function deleteTournament(id: string): Promise<boolean> {
  const items = await readAll();
  const next = items.filter((t) => t.id !== id);
  if (next.length === items.length) return false;
  await writeAll(next);
  return true;
}

export async function hasTournament(id: string): Promise<boolean> {
  const items = await readAll();
  return items.some((t) => t.id === id);
}

/** Inserts a fully-formed tournament (used for demo seeding). No-op if the id exists. */
export async function insertTournament(tournament: Tournament): Promise<void> {
  const items = await readAll();
  if (items.some((t) => t.id === tournament.id)) return;
  items.push(tournament);
  await writeAll(items);
}

/** Adds or replaces a completed match's scorecard on a tournament. */
export async function addMatchToTournament(
  tournamentId: string,
  match: Match,
): Promise<void> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === tournamentId);
  if (index === -1) return;
  const existing = items[index].matches ?? [];
  items[index].matches = [...existing.filter((m) => m.id !== match.id), match];
  await writeAll(items);
}

/** Adds registered players to a tournament's participants (organizer/admin action). */
export async function addParticipants(
  id: string,
  players: { playerId: string; name: string }[],
): Promise<Tournament | "not-found"> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) return "not-found";
  const tournament = items[index];
  const existing = new Set(tournament.participants.map((p) => p.playerId));
  const now = new Date().toISOString();
  let added = 0;
  for (const p of players) {
    if (existing.has(p.playerId)) continue;
    tournament.participants.push({
      playerId: p.playerId,
      name: p.name,
      transactionId: "",
      joinedAt: now,
    });
    existing.add(p.playerId);
    added += 1;
  }
  if (added > 0) await writeAll(items);
  return tournament;
}

export async function removeParticipant(
  id: string,
  playerId: string,
): Promise<Tournament | "not-found" | "not-participant"> {
  const items = await readAll();
  const index = items.findIndex((tournament) => tournament.id === id);
  if (index === -1) return "not-found";
  const tournament = items[index];
  if (!tournament.participants.some((participant) => participant.playerId === playerId)) {
    return "not-participant";
  }
  tournament.participants = tournament.participants.filter(
    (participant) => participant.playerId !== playerId,
  );
  await writeAll(items);
  return tournament;
}
