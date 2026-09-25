import { readStoredArray, writeStoredArray } from "./mongo";

// Badminton teams live independently of any single tournament so that a player
// can create a team and an organizer can later add it to a tournament. A team
// holds one player (singles) or two players (doubles).

export interface BadmintonTeam {
  id: string; // "BDT-001", "BDT-002", ...
  name: string;
  logo?: string;
  ownerId: string;
  ownerName: string;
  playerIds: string[]; // 1 or 2 registered player IDs
  createdAt: string;
}

async function readAll(): Promise<BadmintonTeam[]> {
  return (await readStoredArray<BadmintonTeam>("badmintonTeams", "badminton-teams.json")).map((team) => ({
    ...team,
    playerIds: (team.playerIds ?? []).filter(Boolean),
  }));
}

async function writeAll(items: BadmintonTeam[]): Promise<void> {
  await writeStoredArray("badmintonTeams", "badminton-teams.json", items);
}

export async function listBadmintonTeams(): Promise<BadmintonTeam[]> {
  const items = await readAll();
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBadmintonTeam(id: string): Promise<BadmintonTeam | undefined> {
  const items = await readAll();
  return items.find((t) => t.id === id);
}

/** Resolves several team IDs to teams, preserving the requested order. */
export async function getBadmintonTeams(ids: string[]): Promise<BadmintonTeam[]> {
  const items = await readAll();
  const byId = new Map(items.map((team) => [team.id, team]));
  return ids.map((id) => byId.get(id)).filter((team): team is BadmintonTeam => !!team);
}

export async function listBadmintonTeamsForOwner(ownerId: string): Promise<BadmintonTeam[]> {
  const items = await readAll();
  return items.filter((team) => team.ownerId === ownerId).sort((a, b) => a.name.localeCompare(b.name));
}

/** Cleans and validates a roster: 1 or 2 unique, non-empty player IDs. */
function normalizeRoster(playerIds: unknown): string[] {
  const ids = Array.isArray(playerIds)
    ? [...new Set(playerIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
    : [];
  return ids;
}

export type CreateTeamResult = BadmintonTeam | "invalid-name" | "invalid-roster";

export async function createBadmintonTeam(input: {
  name: string;
  logo?: string;
  ownerId: string;
  ownerName: string;
  playerIds: string[];
}): Promise<CreateTeamResult> {
  const name = input.name.trim();
  if (!name || name.length > 60) return "invalid-name";
  const playerIds = normalizeRoster(input.playerIds);
  if (playerIds.length < 1 || playerIds.length > 2) return "invalid-roster";

  const items = await readAll();
  const team: BadmintonTeam = {
    id: nextTeamId(items),
    name,
    logo: input.logo,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    playerIds,
    createdAt: new Date().toISOString(),
  };
  items.push(team);
  await writeAll(items);
  return team;
}

export type UpdateTeamResult = BadmintonTeam | "not-found" | "invalid-name" | "invalid-roster";

export async function updateBadmintonTeam(
  id: string,
  patch: { name?: string; logo?: string; playerIds?: string[] },
): Promise<UpdateTeamResult> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) return "not-found";
  const team = items[index];

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name || name.length > 60) return "invalid-name";
    team.name = name;
  }
  if (patch.logo !== undefined) team.logo = patch.logo || undefined;
  if (patch.playerIds !== undefined) {
    const playerIds = normalizeRoster(patch.playerIds);
    if (playerIds.length < 1 || playerIds.length > 2) return "invalid-roster";
    team.playerIds = playerIds;
  }

  items[index] = team;
  await writeAll(items);
  return team;
}

export async function deleteBadmintonTeam(id: string): Promise<boolean> {
  const items = await readAll();
  const next = items.filter((t) => t.id !== id);
  if (next.length === items.length) return false;
  await writeAll(next);
  return true;
}

/** The team owner or any admin may manage a badminton team. */
export function canManageBadmintonTeam(
  team: Pick<BadmintonTeam, "ownerId">,
  user: { id: string; isAdmin: boolean },
): boolean {
  return user.isAdmin || team.ownerId === user.id;
}

// Sequential ids: BDT-001, BDT-002, …
function nextTeamId(items: BadmintonTeam[]): string {
  const max = items.reduce((acc, t) => {
    const match = /^BDT-(\d+)$/.exec(t.id);
    const n = match ? Number(match[1]) : 0;
    return n > acc ? n : acc;
  }, 0);
  return `BDT-${String(max + 1).padStart(3, "0")}`;
}
