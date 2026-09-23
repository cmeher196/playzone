import { getTournament } from "./tournaments";
import { readStoredArray, writeStoredArray } from "./mongo";

// JSON-file storage, mirroring the other stores. Swap for a real DB later.
// A team can participate in more than one tournament. `tournamentId` remains
// for compatibility with existing records; `tournamentIds` is authoritative.

export interface TeamPlayer {
  playerId: string;
  name: string;
  playerNumber?: string | number;
}

export interface Team {
  id: string;
  tournamentId: string;
  tournamentIds?: string[];
  name: string;
  logo?: string;
  ownerId: string;
  ownerName: string;
  captainId?: string;
  viceCaptainId?: string;
  players: TeamPlayer[];
  createdAt: string;
}

async function readAll(): Promise<Team[]> {
  return (await readStoredArray<Team>("teams", "teams.json")).map((team) => ({
      ...team,
      tournamentId: team.tournamentId ?? "",
      tournamentIds: team.tournamentIds ?? (team.tournamentId ? [team.tournamentId] : []),
  }));
}

async function writeAll(items: Team[]): Promise<void> {
  await writeStoredArray("teams", "teams.json", items);
}

export async function listTeamsForTournament(
  tournamentId: string,
): Promise<Team[]> {
  const items = await readAll();
  return items
    .filter((team) => belongsToTournament(team, tournamentId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listTeamsForOwner(ownerId: string): Promise<Team[]> {
  const items = await readAll();
  return items.filter((team) => team.ownerId === ownerId).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listTeams(): Promise<Team[]> {
  const items = await readAll();
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export function belongsToTournament(team: Team, tournamentId: string): boolean {
  return (team.tournamentIds ?? []).includes(tournamentId);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const items = await readAll();
  return items.find((t) => t.id === id);
}

/** Player ids already assigned to any team in a tournament. */
export async function assignedPlayerIds(
  tournamentId: string,
): Promise<Set<string>> {
  const items = await readAll();
  const ids = new Set<string>();
  for (const team of items) {
    if (!belongsToTournament(team, tournamentId)) continue;
    for (const p of team.players) ids.add(p.playerId);
  }
  return ids;
}

export async function createTeam(input: {
  tournamentId?: string;
  name: string;
  logo?: string;
  ownerId: string;
  ownerName: string;
}): Promise<Team> {
  const items = await readAll();
  const team: Team = {
    ...input,
    tournamentId: input.tournamentId ?? "",
    tournamentIds: input.tournamentId ? [input.tournamentId] : [],
    id: nextTeamId(items),
    players: [],
    createdAt: new Date().toISOString(),
  };
  items.push(team);
  await writeAll(items);
  return team;
}

export async function addTeamToTournament(
  teamId: string,
  tournamentId: string,
): Promise<Team | "not-found" | "already-added"> {
  const items = await readAll();
  const index = items.findIndex((team) => team.id === teamId);
  if (index === -1) return "not-found";
  const team = items[index];
  if (belongsToTournament(team, tournamentId)) return "already-added";
  team.tournamentIds = [...(team.tournamentIds ?? []), tournamentId];
  await writeAll(items);
  return team;
}

export async function cloneTeamForTournament(
  sourceId: string,
  tournamentId: string,
  ownerId: string,
  ownerName: string,
): Promise<Team | "not-found" | "not-owner"> {
  const items = await readAll();
  const source = items.find((team) => team.id === sourceId);
  if (!source) return "not-found";
  if (source.ownerId !== ownerId) return "not-owner";
  const team: Team = {
    id: nextTeamId(items),
    tournamentId,
    name: source.name,
    logo: source.logo,
    ownerId,
    ownerName,
    captainId: source.captainId,
    viceCaptainId: source.viceCaptainId,
    players: source.players.map((player) => ({ ...player })),
    createdAt: new Date().toISOString(),
  };
  items.push(team);
  await writeAll(items);
  return team;
}

export async function updateTeam(
  id: string,
  patch: Partial<Pick<Team, "name" | "logo" | "captainId" | "viceCaptainId">>,
): Promise<Team | undefined> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...patch };
  await writeAll(items);
  return items[index];
}

export async function deleteTeam(id: string): Promise<boolean> {
  const items = await readAll();
  const next = items.filter((t) => t.id !== id);
  if (next.length === items.length) return false;
  await writeAll(next);
  return true;
}

export type AddPlayerResult =
  | Team
  | "not-found"
  | "already-in-team"
  | "in-other-team";

export async function addPlayerToTeam(
  teamId: string,
  player: TeamPlayer,
): Promise<AddPlayerResult> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === teamId);
  if (index === -1) return "not-found";
  const team = items[index];
  if (team.players.some((p) => p.playerId === player.playerId)) {
    return "already-in-team";
  }
  const inOtherTeam = team.tournamentIds?.some((tournamentId) =>
    items.some(
      (otherTeam) =>
        belongsToTournament(otherTeam, tournamentId) &&
        otherTeam.id !== teamId &&
        otherTeam.players.some((p) => p.playerId === player.playerId),
    ),
  );
  if (inOtherTeam) return "in-other-team";
  team.players.push(player);
  await writeAll(items);
  return team;
}

export async function removePlayerFromTeam(
  teamId: string,
  playerId: string,
): Promise<Team | "not-found"> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === teamId);
  if (index === -1) return "not-found";
  const team = items[index];
  team.players = team.players.filter((p) => p.playerId !== playerId);
  if (team.captainId === playerId) team.captainId = undefined;
  if (team.viceCaptainId === playerId) team.viceCaptainId = undefined;
  await writeAll(items);
  return team;
}

/** Team owner, the tournament organizer, and any admin may manage a team. */
export function canManageTeam(
  team: Pick<Team, "ownerId">,
  tournament: { organizerId: string } | undefined,
  user: { id: string; isAdmin: boolean },
): boolean {
  return (
    user.isAdmin ||
    team.ownerId === user.id ||
    tournament?.organizerId === user.id
  );
}

export async function canManageTeamForUser(
  team: Team,
  user: { id: string; isAdmin: boolean },
): Promise<boolean> {
  if (user.isAdmin || team.ownerId === user.id) return true;
  const tournaments = await Promise.all(
    (team.tournamentIds ?? []).map((tournamentId) => getTournament(tournamentId)),
  );
  return tournaments.some((tournament) => tournament?.organizerId === user.id);
}

// Sequential ids: TM-001, TM-002, …
function nextTeamId(items: Team[]): string {
  const max = items.reduce((acc, t) => {
    const match = /^TM-(\d+)$/.exec(t.id);
    const n = match ? Number(match[1]) : 0;
    return n > acc ? n : acc;
  }, 0);
  return `TM-${String(max + 1).padStart(3, "0")}`;
}
