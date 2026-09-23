import crypto from "node:crypto";
import { readStoredArray, writeStoredArray } from "./mongo";

// Badminton-specific tournament, court, and match types
// Extends the cricket tournament concept to support multiple courts and rally-point scoring

export interface Court {
  id: string; // "C-001", "C-002", etc.
  number: number; // 1-indexed display number
  tournamentId: string;
  createdAt: string;
}

export type BadmintonMatchFormat = "singles" | "doubles";
export type BadmintonMatchStatus = "scheduled" | "ready" | "live" | "paused" | "completed" | "cancelled";

export interface BadmintonGameScore {
  playerAScore: number;
  playerBScore: number;
  isCompleted: boolean;
  winner?: "playerA" | "playerB"; // null if in progress
}

export interface BadmintonMatch {
  id: string; // "BDM-001", "BDM-002", etc.
  courtId: string;
  tournamentId: string;
  format: BadmintonMatchFormat;
  // Singles: playerA, playerB
  // Doubles: side A = playerA + playerC, side B = playerB + playerD
  playerA: string; // playerId ("" when TBD in a bracket)
  playerB: string; // playerId ("" when TBD in a bracket)
  playerC?: string; // playerId (doubles only)
  playerD?: string; // playerId (doubles only)
  status: BadmintonMatchStatus;
  assignedScorerId?: string; // null if not assigned
  bestOf?: number; // games per match (overrides tournament default)
  pointsToWin?: number; // points to win a game (overrides tournament default)
  games: BadmintonGameScore[]; // Best of 3: max 3 elements
  currentGameIndex: number; // 0, 1, or 2
  matchWinner?: "playerA" | "playerB"; // null until match completed
  // Knockout bracket linkage
  round?: string; // e.g., "Semi Final", "Final"
  nextMatchId?: string; // winner advances into this match
  nextSlot?: "A" | "B"; // which side of the next match the winner fills
  isBye?: boolean; // auto-advanced walkover
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ScoreEvent {
  id: string; // UUID
  matchId: string;
  gameNumber: number; // 1, 2, or 3
  scorerUserId: string;
  playerScored: "playerA" | "playerB";
  scoredByPlayerId?: string; // doubles: which individual player won the rally
  previousScore: { playerAScore: number; playerBScore: number };
  newScore: { playerAScore: number; playerBScore: number };
  timestamp: string;
  eventType: "score" | "undo" | "correction";
  sequence: number; // For concurrency control
}

export interface BadmintonTournament {
  id: string; // "BD-001", "BD-002", etc.
  name: string;
  description?: string;
  venue?: string;
  sport: "badminton";
  courtCount: number; // Configurable 1..N
  courts: Court[];
  matches: BadmintonMatch[];
  scoreEvents: ScoreEvent[];
  organizerId: string;
  organizerName: string;
  participantIds: string[]; // Player IDs registered for tournament
  bestOf?: number; // games per match (default 3)
  pointsToWin?: number; // points to win a game (default 21)
  createdAt: string;
  status: "scheduled" | "live" | "completed";
}

async function readAll(): Promise<BadmintonTournament[]> {
  return readStoredArray<BadmintonTournament>("badmintonTournaments", "badminton-tournaments.json");
}

async function writeAll(items: BadmintonTournament[]): Promise<void> {
  await writeStoredArray("badmintonTournaments", "badminton-tournaments.json", items);
}

// ===== TOURNAMENT CRUD =====

export async function listBadmintonTournaments(): Promise<BadmintonTournament[]> {
  const items = await readAll();
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBadmintonTournament(id: string): Promise<BadmintonTournament | undefined> {
  const items = await readAll();
  return items.find((t) => t.id === id);
}

export async function createBadmintonTournament(input: {
  name: string;
  description?: string;
  venue?: string;
  courtCount: number;
  bestOf?: number;
  pointsToWin?: number;
  organizerId: string;
  organizerName: string;
}): Promise<BadmintonTournament> {
  const items = await readAll();
  const tournament: BadmintonTournament = {
    ...input,
    id: nextBadmintonTournamentId(items),
    sport: "badminton",
    courts: [],
    matches: [],
    scoreEvents: [],
    participantIds: [],
    createdAt: new Date().toISOString(),
    status: "scheduled",
  };

  // Auto-create courts
  for (let i = 1; i <= input.courtCount; i++) {
    tournament.courts.push({
      id: `${tournament.id}-C${i}`,
      number: i,
      tournamentId: tournament.id,
      createdAt: new Date().toISOString(),
    });
  }

  items.push(tournament);
  await writeAll(items);
  return tournament;
}

export async function updateBadmintonTournament(
  id: string,
  patch: Partial<Pick<BadmintonTournament, "name" | "description" | "venue" | "status" | "participantIds">>,
): Promise<BadmintonTournament | undefined> {
  const items = await readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...patch };
  await writeAll(items);
  return items[index];
}

/** Adds a registered player to a badminton tournament. */
export async function joinBadmintonTournament(
  id: string,
  playerId: string,
): Promise<BadmintonTournament | "not-found" | "already-joined"> {
  const items = await readAll();
  const tournament = items.find((item) => item.id === id);
  if (!tournament) return "not-found";
  if (tournament.participantIds.includes(playerId)) return "already-joined";

  tournament.participantIds.push(playerId);
  await writeAll(items);
  return tournament;
}

export async function deleteBadmintonTournament(id: string): Promise<boolean> {
  const items = await readAll();
  const next = items.filter((t) => t.id !== id);
  if (next.length === items.length) return false;
  await writeAll(next);
  return true;
}

// ===== COURT MANAGEMENT =====

export async function listCourts(tournamentId: string): Promise<Court[]> {
  const tournament = await getBadmintonTournament(tournamentId);
  return tournament?.courts ?? [];
}

export async function getCourtById(tournamentId: string, courtId: string): Promise<Court | undefined> {
  const courts = await listCourts(tournamentId);
  return courts.find((c) => c.id === courtId);
}

// ===== MATCH MANAGEMENT =====

/** Fresh, all-zero games array of the given length. */
function blankGames(count: number): BadmintonGameScore[] {
  return Array.from({ length: Math.max(1, count) }, () => ({
    playerAScore: 0,
    playerBScore: 0,
    isCompleted: false,
  }));
}

export async function createBadmintonMatch(input: {
  tournamentId: string;
  courtId: string;
  format: BadmintonMatchFormat;
  playerA: string;
  playerB: string;
  playerC?: string;
  playerD?: string;
  bestOf?: number;
  pointsToWin?: number;
}): Promise<BadmintonMatch | "tournament-not-found" | "court-not-found" | "court-busy"> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === input.tournamentId);
  if (!tournament) return "tournament-not-found";

  const court = tournament.courts.find((c) => c.id === input.courtId);
  if (!court) return "court-not-found";

  // Validate: no same player in multiple simultaneous matches on same court
  const matchOnCourt = tournament.matches.find(
    (m) => m.courtId === input.courtId && (m.status === "live" || m.status === "ready"),
  );
  if (matchOnCourt) {
    return "court-busy";
  }

  const match: BadmintonMatch = {
    id: nextBadmintonMatchId(tournament.matches),
    courtId: input.courtId,
    tournamentId: input.tournamentId,
    format: input.format,
    playerA: input.playerA,
    playerB: input.playerB,
    playerC: input.playerC,
    playerD: input.playerD,
    status: "scheduled",
    bestOf: input.bestOf,
    pointsToWin: input.pointsToWin,
    games: blankGames(input.bestOf ?? tournament.bestOf ?? 3),
    currentGameIndex: 0,
    createdAt: new Date().toISOString(),
  };

  tournament.matches.push(match);
  await writeAll(items);
  return match;
}

/** Randomly seeds participants into a single-elimination knockout bracket. */
export async function generateKnockoutSchedule(input: {
  tournamentId: string;
  format: BadmintonMatchFormat;
  reset?: boolean;
}): Promise<
  | { created: number; rounds: number }
  | "tournament-not-found"
  | "no-courts"
  | "not-enough-players"
  | "already-exists"
> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === input.tournamentId);
  if (!tournament) return "tournament-not-found";
  if (tournament.courts.length === 0) return "no-courts";
  if (tournament.matches.length > 0 && !input.reset) return "already-exists";
  if (input.reset) {
    tournament.matches = [];
    tournament.scoreEvents = [];
  }

  // Build entrants: singles = 1 player, doubles = fixed pair of 2.
  const shuffled = shuffle(tournament.participantIds);
  const entrants: string[][] = [];
  if (input.format === "doubles") {
    for (let i = 0; i + 2 <= shuffled.length; i += 2) entrants.push([shuffled[i], shuffled[i + 1]]);
  } else {
    for (const id of shuffled) entrants.push([id]);
  }
  if (entrants.length < 2) return "not-enough-players";

  const bracketSize = nextPow2(entrants.length);
  const rounds = Math.log2(bracketSize);
  const order = seedOrder(bracketSize); // bracket position -> seed number (1-based)

  // Create all matches, round by round, and link winners forward.
  let idCounter = 0;
  const genId = () => {
    idCounter += 1;
    return `BDM-${String(idCounter).padStart(3, "0")}`;
  };
  const now = new Date().toISOString();
  const emptyGames = (): BadmintonGameScore[] => blankGames(tournament.bestOf ?? 3);

  const grid: BadmintonMatch[][] = [];
  let courtIdx = 0;
  for (let r = 0; r < rounds; r += 1) {
    const count = bracketSize / 2 ** (r + 1);
    grid[r] = [];
    for (let i = 0; i < count; i += 1) {
      const court = tournament.courts[courtIdx % tournament.courts.length];
      courtIdx += 1;
      grid[r].push({
        id: genId(),
        courtId: court.id,
        tournamentId: tournament.id,
        format: input.format,
        playerA: "",
        playerB: "",
        status: "scheduled",
        round: knockoutRoundName(rounds - r),
        games: emptyGames(),
        currentGameIndex: 0,
        createdAt: now,
      });
    }
  }

  // Forward links: match (r,i) -> (r+1, floor(i/2)), slot by parity.
  for (let r = 0; r < rounds - 1; r += 1) {
    for (let i = 0; i < grid[r].length; i += 1) {
      const next = grid[r + 1][Math.floor(i / 2)];
      grid[r][i].nextMatchId = next.id;
      grid[r][i].nextSlot = i % 2 === 0 ? "A" : "B";
    }
  }

  // Seed round-0 entrants using a bye-distributing seed order.
  for (let i = 0; i < grid[0].length; i += 1) {
    const seedTop = order[i * 2]; // 1-based seed
    const seedBottom = order[i * 2 + 1];
    const eTop = entrants[seedTop - 1];
    const eBottom = entrants[seedBottom - 1];
    const m = grid[0][i];
    if (eTop) {
      m.playerA = eTop[0];
      if (eTop[1]) m.playerC = eTop[1];
    }
    if (eBottom) {
      m.playerB = eBottom[0];
      if (eBottom[1]) m.playerD = eBottom[1];
    }
  }

  tournament.matches = grid.flat();

  // Cascade byes: a match with exactly one entrant auto-advances that entrant.
  for (let r = 0; r < rounds; r += 1) {
    for (const m of grid[r]) {
      if (m.status !== "scheduled") continue;
      const hasA = !!m.playerA;
      const hasB = !!m.playerB;
      if (hasA === hasB) continue; // both present (play) or both empty (upstream bye)
      m.status = "completed";
      m.matchWinner = hasA ? "playerA" : "playerB";
      m.isBye = true;
      m.completedAt = now;
      advanceWinnerToNext(tournament, m);
    }
  }

  await writeAll(items);
  return { created: tournament.matches.length, rounds };
}

/** Copies a completed match's winning entrant into its downstream match slot. */
function advanceWinnerToNext(tournament: BadmintonTournament, match: BadmintonMatch): void {
  if (!match.nextMatchId || !match.nextSlot || !match.matchWinner) return;
  const next = tournament.matches.find((m) => m.id === match.nextMatchId);
  if (!next) return;
  const winners =
    match.matchWinner === "playerA"
      ? [match.playerA, ...(match.playerC ? [match.playerC] : [])]
      : [match.playerB, ...(match.playerD ? [match.playerD] : [])];
  if (match.nextSlot === "A") {
    next.playerA = winners[0] ?? "";
    if (winners[1]) next.playerC = winners[1];
  } else {
    next.playerB = winners[0] ?? "";
    if (winners[1]) next.playerD = winners[1];
  }
}

/** Clears the downstream slot that a match previously fed (used when undoing a decider). */
function clearWinnerFromNext(tournament: BadmintonTournament, match: BadmintonMatch): void {
  if (!match.nextMatchId || !match.nextSlot) return;
  const next = tournament.matches.find((m) => m.id === match.nextMatchId);
  if (!next) return;
  if (match.nextSlot === "A") {
    next.playerA = "";
    next.playerC = undefined;
  } else {
    next.playerB = "";
    next.playerD = undefined;
  }
}

export async function getBadmintonMatch(
  tournamentId: string,
  matchId: string,
): Promise<BadmintonMatch | undefined> {
  const tournament = await getBadmintonTournament(tournamentId);
  return tournament?.matches.find((m) => m.id === matchId);
}

export async function updateBadmintonMatchStatus(
  tournamentId: string,
  matchId: string,
  status: BadmintonMatchStatus,
): Promise<BadmintonMatch | undefined> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === tournamentId);
  if (!tournament) return undefined;

  const match = tournament.matches.find((m) => m.id === matchId);
  if (!match) return undefined;

  match.status = status;
  if (status === "live" && !match.startedAt) match.startedAt = new Date().toISOString();
  if (status === "completed" && !match.completedAt) match.completedAt = new Date().toISOString();

  await writeAll(items);
  return match;
}

export type EditMatchResult = BadmintonMatch | "not-found" | "locked";

/** Edits players/court/format of a match that has not started scoring yet. */
export async function editBadmintonMatch(
  tournamentId: string,
  matchId: string,
  patch: {
    courtId?: string;
    format?: BadmintonMatchFormat;
    playerA?: string;
    playerB?: string;
    playerC?: string;
    playerD?: string;
  },
): Promise<EditMatchResult> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === tournamentId);
  if (!tournament) return "not-found";
  const match = tournament.matches.find((m) => m.id === matchId);
  if (!match) return "not-found";

  // Only editable before any points are scored and while not completed/live.
  const hasScores = tournament.scoreEvents.some((e) => e.matchId === matchId);
  if (hasScores || match.status === "completed" || match.status === "live") return "locked";

  if (patch.courtId && tournament.courts.some((c) => c.id === patch.courtId)) {
    match.courtId = patch.courtId;
  }
  if (patch.format) match.format = patch.format;
  if (patch.playerA !== undefined) match.playerA = patch.playerA;
  if (patch.playerB !== undefined) match.playerB = patch.playerB;
  match.playerC = match.format === "doubles" ? patch.playerC ?? match.playerC : undefined;
  match.playerD = match.format === "doubles" ? patch.playerD ?? match.playerD : undefined;

  await writeAll(items);
  return match;
}

export type RulesUpdateResult =
  | { ok: true; match: BadmintonMatch }
  | { ok: false; error: "not-found" | "next-started" | "reduce-below-played" | "invalid" };

/**
 * Changes a match's games (bestOf) and/or points-to-win — allowed even while live.
 * Results are re-derived from the stored per-game scores under the new rules, so an
 * in-progress match stays consistent (a lower target may immediately settle a game).
 */
export async function updateBadmintonMatchRules(
  tournamentId: string,
  matchId: string,
  patch: { bestOf?: number; pointsToWin?: number },
): Promise<RulesUpdateResult> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === tournamentId);
  if (!tournament) return { ok: false, error: "not-found" };
  const match = tournament.matches.find((m) => m.id === matchId);
  if (!match) return { ok: false, error: "not-found" };

  const nextBestOf = patch.bestOf ?? match.bestOf ?? tournament.bestOf ?? 3;
  const nextPoints = patch.pointsToWin ?? match.pointsToWin ?? tournament.pointsToWin ?? 21;
  if (nextBestOf < 1 || nextBestOf > 15 || nextPoints < 5 || nextPoints > 99) {
    return { ok: false, error: "invalid" };
  }

  // Block changes once this match has fed a downstream match that already began.
  if (match.nextMatchId) {
    const next = tournament.matches.find((m) => m.id === match.nextMatchId);
    const nextStarted =
      next && (next.status !== "scheduled" || tournament.scoreEvents.some((e) => e.matchId === next.id));
    if (nextStarted) return { ok: false, error: "next-started" };
  }

  const rules = resolveBadmintonRules({ bestOf: nextBestOf, pointsToWin: nextPoints });

  // Resize the games array; never drop a game that already carries points.
  if (match.games.length > nextBestOf) {
    const hasScoresBeyond = match.games
      .slice(nextBestOf)
      .some((g) => g.playerAScore > 0 || g.playerBScore > 0);
    if (hasScoresBeyond) return { ok: false, error: "reduce-below-played" };
    match.games = match.games.slice(0, nextBestOf);
  } else {
    while (match.games.length < nextBestOf) {
      match.games.push({ playerAScore: 0, playerBScore: 0, isCompleted: false });
    }
  }

  // Re-derive game winners, current game, and match result from the stored scores.
  const wasCompleted = !!match.matchWinner;
  let winsA = 0;
  let winsB = 0;
  let decidedAt = -1;
  let firstOpen = -1;
  for (let i = 0; i < match.games.length; i += 1) {
    const g = match.games[i];
    if (decidedAt !== -1) {
      g.playerAScore = 0;
      g.playerBScore = 0;
      g.isCompleted = false;
      g.winner = undefined;
      continue;
    }
    const w = computeGameWinner(g.playerAScore, g.playerBScore, rules);
    if (w) {
      g.isCompleted = true;
      g.winner = w;
      if (w === "playerA") winsA += 1;
      else winsB += 1;
      if (winsA >= rules.gamesToWin || winsB >= rules.gamesToWin) decidedAt = i;
    } else {
      g.isCompleted = false;
      g.winner = undefined;
      if (firstOpen === -1) firstOpen = i;
    }
  }

  const newWinner: "playerA" | "playerB" | undefined =
    decidedAt !== -1 ? (winsA > winsB ? "playerA" : "playerB") : undefined;

  // Keep the bracket in sync (safe: we blocked when the next match had started).
  if (wasCompleted) clearWinnerFromNext(tournament, match);

  match.bestOf = nextBestOf;
  match.pointsToWin = nextPoints;
  match.matchWinner = newWinner;
  if (newWinner) {
    match.status = "completed";
    match.completedAt = match.completedAt ?? new Date().toISOString();
    match.currentGameIndex = decidedAt;
    advanceWinnerToNext(tournament, match);
  } else {
    if (match.status === "completed") match.status = "live";
    match.completedAt = undefined;
    match.currentGameIndex = firstOpen === -1 ? Math.max(0, match.games.length - 1) : firstOpen;
  }

  await writeAll(items);
  return { ok: true, match };
}

/** Deletes a match and its score events. Also unlinks it from any bracket. */
export async function deleteBadmintonMatch(
  tournamentId: string,
  matchId: string,
): Promise<boolean> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === tournamentId);
  if (!tournament) return false;
  const exists = tournament.matches.some((m) => m.id === matchId);
  if (!exists) return false;

  tournament.matches = tournament.matches.filter((m) => m.id !== matchId);
  tournament.scoreEvents = tournament.scoreEvents.filter((e) => e.matchId !== matchId);
  // Remove any bracket links pointing at the deleted match.
  for (const m of tournament.matches) {
    if (m.nextMatchId === matchId) {
      m.nextMatchId = undefined;
      m.nextSlot = undefined;
    }
  }
  await writeAll(items);
  return true;
}

// ===== SCORER ASSIGNMENT =====

export async function assignScorer(
  tournamentId: string,
  matchId: string,
  scorerId: string,
): Promise<BadmintonMatch | undefined> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === tournamentId);
  if (!tournament) return undefined;

  const match = tournament.matches.find((m) => m.id === matchId);
  if (!match) return undefined;

  match.assignedScorerId = scorerId;
  await writeAll(items);
  return match;
}

export async function removeScorer(
  tournamentId: string,
  matchId: string,
): Promise<BadmintonMatch | undefined> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === tournamentId);
  if (!tournament) return undefined;

  const match = tournament.matches.find((m) => m.id === matchId);
  if (!match) return undefined;

  match.assignedScorerId = undefined;
  await writeAll(items);
  return match;
}

export async function getAssignedMatch(scorerId: string): Promise<BadmintonMatch | undefined> {
  const items = await readAll();
  for (const tournament of items) {
    const match = tournament.matches.find((m) => m.assignedScorerId === scorerId && m.status === "live");
    if (match) return match;
  }
  return undefined;
}

// ===== PERMISSIONS =====

export function canManageBadmintonTournament(
  tournament: BadmintonTournament,
  user: { id: string; isAdmin: boolean },
): boolean {
  return user.isAdmin || tournament.organizerId === user.id;
}

export function canScoreBadmintonMatch(match: BadmintonMatch, user: { id: string }): boolean {
  return match.assignedScorerId === user.id && match.status === "live";
}

// ===== SCORING ENGINE (rally-point, configurable games/points) =====

export interface BadmintonRules {
  bestOf: number;
  pointsToWin: number;
  winBy: number;
  maxPoints: number;
  gamesToWin: number;
}

/** Resolves per-tournament scoring rules, defaulting to standard 21-point best-of-3. */
export function resolveBadmintonRules(source: {
  bestOf?: number;
  pointsToWin?: number;
}): BadmintonRules {
  const bestOf = source.bestOf && source.bestOf > 0 ? source.bestOf : 3;
  const pointsToWin = source.pointsToWin && source.pointsToWin > 0 ? source.pointsToWin : 21;
  return { bestOf, pointsToWin, winBy: 2, maxPoints: pointsToWin + 9, gamesToWin: Math.ceil(bestOf / 2) };
}

/** Match-level games/points override the tournament defaults. */
export function resolveMatchRules(
  tournament: Pick<BadmintonTournament, "bestOf" | "pointsToWin">,
  match: Pick<BadmintonMatch, "bestOf" | "pointsToWin">,
): BadmintonRules {
  return resolveBadmintonRules({
    bestOf: match.bestOf ?? tournament.bestOf,
    pointsToWin: match.pointsToWin ?? tournament.pointsToWin,
  });
}

/** Returns the winning side of a game, or undefined if still in progress. */
function computeGameWinner(
  a: number,
  b: number,
  rules: BadmintonRules,
): "playerA" | "playerB" | undefined {
  const high = Math.max(a, b);
  if (high < rules.pointsToWin) return undefined;
  if (high >= rules.maxPoints) return a > b ? "playerA" : "playerB";
  if (Math.abs(a - b) < rules.winBy) return undefined;
  return a > b ? "playerA" : "playerB";
}

function countGamesWon(match: BadmintonMatch): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const g of match.games) {
    if (g.winner === "playerA") a += 1;
    else if (g.winner === "playerB") b += 1;
  }
  return { a, b };
}

export type ScoreResultCode =
  | "not-found"
  | "not-live"
  | "game-complete"
  | "match-complete"
  | "conflict"
  | "nothing-to-undo";

export type ScoreResult =
  | { ok: true; match: BadmintonMatch; sequence: number; playerPoints: Record<string, number> }
  | { ok: false; error: string; code: ScoreResultCode };

/**
 * Per-player rally wins for a match (drives the per-team "man of the match").
 * Back-compat: events without scoredByPlayerId are credited to the side's primary player.
 */
export function tallyPlayerPoints(
  tournament: Pick<BadmintonTournament, "scoreEvents">,
  match: Pick<BadmintonMatch, "id" | "playerA" | "playerB" | "playerC" | "playerD">,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const pid of [match.playerA, match.playerB, match.playerC, match.playerD]) {
    if (pid) totals[pid] = 0;
  }
  for (const e of tournament.scoreEvents) {
    if (e.matchId !== match.id || e.eventType !== "score") continue;
    const pid = e.scoredByPlayerId ?? (e.playerScored === "playerA" ? match.playerA : match.playerB);
    if (!pid) continue;
    totals[pid] = (totals[pid] ?? 0) + 1;
  }
  return totals;
}

/** Number of score events already recorded for a match (used for optimistic concurrency). */
function matchEventCount(tournament: BadmintonTournament, matchId: string): number {
  return tournament.scoreEvents.filter((e) => e.matchId === matchId && e.eventType === "score").length;
}

/** Applies one rally point to the current game. Enforces permissions server-side. */
export async function applyScorePoint(input: {
  tournamentId: string;
  matchId: string;
  scorerUserId: string;
  isOwnerOrAdmin: boolean;
  side: "playerA" | "playerB";
  playerId?: string;
  expectedSequence?: number;
}): Promise<ScoreResult> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournament not found", code: "not-found" };
  const match = tournament.matches.find((m) => m.id === input.matchId);
  if (!match) return { ok: false, error: "Match not found", code: "not-found" };

  // Server-side authorization: assigned scorer, or the owner/admin.
  if (!input.isOwnerOrAdmin && match.assignedScorerId !== input.scorerUserId) {
    return { ok: false, error: "You are not assigned to score this match", code: "not-live" };
  }
  if (match.status !== "live") return { ok: false, error: "Match is not live", code: "not-live" };
  if (match.matchWinner) return { ok: false, error: "Match already complete", code: "match-complete" };

  const game = match.games[match.currentGameIndex];
  if (!game || game.isCompleted) return { ok: false, error: "Current game is complete", code: "game-complete" };

  const currentCount = matchEventCount(tournament, match.id);
  if (input.expectedSequence !== undefined && input.expectedSequence !== currentCount) {
    return { ok: false, error: "Score changed elsewhere, please retry", code: "conflict" };
  }

  const rules = resolveMatchRules(tournament, match);
  const sidePlayers = (
    input.side === "playerA" ? [match.playerA, match.playerC] : [match.playerB, match.playerD]
  ).filter((p): p is string => !!p);
  const scoredByPlayerId =
    input.playerId && sidePlayers.includes(input.playerId) ? input.playerId : sidePlayers[0];

  const previousScore = { playerAScore: game.playerAScore, playerBScore: game.playerBScore };
  if (input.side === "playerA") game.playerAScore += 1;
  else game.playerBScore += 1;
  const newScore = { playerAScore: game.playerAScore, playerBScore: game.playerBScore };

  tournament.scoreEvents.push({
    id: crypto.randomUUID(),
    matchId: match.id,
    gameNumber: match.currentGameIndex + 1,
    scorerUserId: input.scorerUserId,
    playerScored: input.side,
    scoredByPlayerId,
    previousScore,
    newScore,
    timestamp: new Date().toISOString(),
    eventType: "score",
    sequence: currentCount + 1,
  });

  const gameWinner = computeGameWinner(game.playerAScore, game.playerBScore, rules);
  if (gameWinner) {
    game.isCompleted = true;
    game.winner = gameWinner;
    const won = countGamesWon(match);
    if (won.a >= rules.gamesToWin || won.b >= rules.gamesToWin) {
      match.matchWinner = won.a > won.b ? "playerA" : "playerB";
      match.status = "completed";
      match.completedAt = new Date().toISOString();
      // Advance the winner into the next bracket match (if any).
      advanceWinnerToNext(tournament, match);
    } else if (match.currentGameIndex < match.games.length - 1) {
      match.currentGameIndex += 1;
    }
  }

  // Keep tournament status in sync
  if (tournament.status === "scheduled") tournament.status = "live";

  await writeAll(items);
  return { ok: true, match, sequence: currentCount + 1, playerPoints: tallyPlayerPoints(tournament, match) };
}

/** Reverts the last rally point for a match. */
export async function undoLastScore(input: {
  tournamentId: string;
  matchId: string;
  scorerUserId: string;
  isOwnerOrAdmin: boolean;
}): Promise<ScoreResult> {
  const items = await readAll();
  const tournament = items.find((t) => t.id === input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournament not found", code: "not-found" };
  const match = tournament.matches.find((m) => m.id === input.matchId);
  if (!match) return { ok: false, error: "Match not found", code: "not-found" };

  if (!input.isOwnerOrAdmin && match.assignedScorerId !== input.scorerUserId) {
    return { ok: false, error: "You are not assigned to score this match", code: "not-live" };
  }

  const scoreEvents = tournament.scoreEvents.filter((e) => e.matchId === match.id && e.eventType === "score");
  if (scoreEvents.length === 0) return { ok: false, error: "Nothing to undo", code: "nothing-to-undo" };
  const lastEvent = scoreEvents[scoreEvents.length - 1];

  // If this match already fed a winner into a downstream match that has begun,
  // block the undo so brackets can't desync.
  if (match.matchWinner && match.nextMatchId) {
    const next = tournament.matches.find((m) => m.id === match.nextMatchId);
    const nextStarted =
      next &&
      (next.status !== "scheduled" ||
        tournament.scoreEvents.some((e) => e.matchId === next.id));
    if (nextStarted) {
      return {
        ok: false,
        error: "The next round has already started — cannot undo this result",
        code: "nothing-to-undo",
      };
    }
  }

  tournament.scoreEvents = tournament.scoreEvents.filter((e) => e.id !== lastEvent.id);

  // If undoing reopens a completed match, pull its winner back out of the next match.
  if (match.matchWinner) {
    clearWinnerFromNext(tournament, match);
  }

  // Reopen the match if the undone point had completed it.
  match.matchWinner = undefined;
  match.completedAt = undefined;
  if (match.status === "completed") match.status = "live";

  const gameIdx = lastEvent.gameNumber - 1;
  match.currentGameIndex = gameIdx;
  const game = match.games[gameIdx];
  game.playerAScore = lastEvent.previousScore.playerAScore;
  game.playerBScore = lastEvent.previousScore.playerBScore;
  game.isCompleted = false;
  game.winner = undefined;

  // Clear any later games that shouldn't exist yet.
  for (let i = gameIdx + 1; i < match.games.length; i += 1) {
    match.games[i].playerAScore = 0;
    match.games[i].playerBScore = 0;
    match.games[i].isCompleted = false;
    match.games[i].winner = undefined;
  }

  await writeAll(items);
  return { ok: true, match, sequence: matchEventCount(tournament, match.id), playerPoints: tallyPlayerPoints(tournament, match) };
}

/** All matches assigned to a scorer, across every tournament (for the scoring desk). */
export async function getScorerMatches(
  scorerId: string,
): Promise<{ tournament: BadmintonTournament; match: BadmintonMatch }[]> {
  const items = await readAll();
  const result: { tournament: BadmintonTournament; match: BadmintonMatch }[] = [];
  for (const tournament of items) {
    for (const match of tournament.matches) {
      if (match.assignedScorerId === scorerId && match.status !== "cancelled") {
        result.push({ tournament, match });
      }
    }
  }
  return result;
}

/** Count of score events for a match — clients send this back for optimistic concurrency. */
export function getMatchSequence(tournament: BadmintonTournament, matchId: string): number {
  return matchEventCount(tournament, matchId);
}

// ===== STANDINGS & PERFORMANCE =====

export interface BadmintonStandingRow {
  playerId: string;
  played: number;
  won: number;
  lost: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
}

/**
 * Per-player points table computed from completed, actually-played matches
 * (walkover byes are excluded). Doubles credit every member of the side.
 */
export function computeBadmintonStandings(tournament: BadmintonTournament): BadmintonStandingRow[] {
  const rows = new Map<string, BadmintonStandingRow>();
  const row = (id: string): BadmintonStandingRow => {
    let r = rows.get(id);
    if (!r) {
      r = { playerId: id, played: 0, won: 0, lost: 0, gamesWon: 0, gamesLost: 0, pointsFor: 0, pointsAgainst: 0 };
      rows.set(id, r);
    }
    return r;
  };

  for (const m of tournament.matches) {
    if (m.status !== "completed" || m.isBye || !m.matchWinner) continue;
    const sideA = [m.playerA, ...(m.playerC ? [m.playerC] : [])].filter(Boolean);
    const sideB = [m.playerB, ...(m.playerD ? [m.playerD] : [])].filter(Boolean);
    if (sideA.length === 0 || sideB.length === 0) continue;

    let gamesA = 0;
    let gamesB = 0;
    let pointsA = 0;
    let pointsB = 0;
    for (const g of m.games) {
      pointsA += g.playerAScore;
      pointsB += g.playerBScore;
      if (g.winner === "playerA") gamesA += 1;
      else if (g.winner === "playerB") gamesB += 1;
    }

    for (const id of sideA) {
      const r = row(id);
      r.played += 1;
      r.gamesWon += gamesA;
      r.gamesLost += gamesB;
      r.pointsFor += pointsA;
      r.pointsAgainst += pointsB;
      if (m.matchWinner === "playerA") r.won += 1;
      else r.lost += 1;
    }
    for (const id of sideB) {
      const r = row(id);
      r.played += 1;
      r.gamesWon += gamesB;
      r.gamesLost += gamesA;
      r.pointsFor += pointsB;
      r.pointsAgainst += pointsA;
      if (m.matchWinner === "playerB") r.won += 1;
      else r.lost += 1;
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.won - a.won ||
      b.gamesWon - b.gamesLost - (a.gamesWon - a.gamesLost) ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
      b.pointsFor - a.pointsFor,
  );
}

// ===== HELPERS =====

/** Fisher-Yates shuffle using crypto randomness. Returns a new array. */
function shuffle<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Smallest power of two >= n (minimum 2). */
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}

/** Human label for a knockout round given how many rounds remain (1 = Final). */
function knockoutRoundName(roundsRemaining: number): string {
  if (roundsRemaining === 1) return "Final";
  if (roundsRemaining === 2) return "Semi Final";
  if (roundsRemaining === 3) return "Quarter Final";
  return `Round of ${2 ** roundsRemaining}`;
}

/**
 * Standard single-elimination seed order for a bracket of `size` positions.
 * Returns, for each position 0..size-1, the 1-based seed that sits there. Pairs
 * the strongest seeds against the weakest so byes (highest seeds) never meet.
 */
function seedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(sum - s);
    }
    seeds = next;
  }
  return seeds;
}

function nextBadmintonTournamentId(items: BadmintonTournament[]): string {
  const max = items.reduce((acc, t) => {
    const match = /^BD-(\d+)$/.exec(t.id);
    const n = match ? Number(match[1]) : 0;
    return n > acc ? n : acc;
  }, 0);
  return `BD-${String(max + 1).padStart(3, "0")}`;
}

function nextBadmintonMatchId(matches: BadmintonMatch[]): string {
  const max = matches.reduce((acc, m) => {
    const match = /^BDM-(\d+)$/.exec(m.id);
    const n = match ? Number(match[1]) : 0;
    return n > acc ? n : acc;
  }, 0);
  return `BDM-${String(max + 1).padStart(3, "0")}`;
}
