import {
  computeMatch,
  ballsToOvers,
  type LiveMatch,
  type ScoreEvent,
  type TeamRef,
  type Decision,
  type InningsState,
  type ComputedMatch,
} from "./live-scoring";
import { addMatchToTournament, type Match } from "./tournaments";
import { readStoredArray, writeStoredArray } from "./mongo";
import { isScorer, type Scorer } from "./scorers";

async function readAll(): Promise<LiveMatch[]> {
  return readStoredArray<LiveMatch>("liveMatches", "live-matches.json");
}

async function writeAll(items: LiveMatch[]): Promise<void> {
  await writeStoredArray("liveMatches", "live-matches.json", items);
}

export async function listLiveMatchesForTournament(
  tournamentId: string,
): Promise<LiveMatch[]> {
  const items = await readAll();
  return items
    .filter((m) => m.tournamentId === tournamentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listAllLiveMatches(): Promise<LiveMatch[]> {
  const items = await readAll();
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLiveMatch(id: string): Promise<LiveMatch | undefined> {
  const items = await readAll();
  return items.find((m) => m.id === id);
}

export async function rescheduleLiveMatch(
  id: string,
  date: string,
  venue?: string,
): Promise<LiveMatch | "not-found" | "locked"> {
  const items = await readAll();
  const index = items.findIndex((match) => match.id === id);
  if (index === -1) return "not-found";
  const match = items[index];
  if (match.status !== "scheduled") return "locked";
  match.date = date;
  match.venue = venue || undefined;
  await writeAll(items);
  return match;
}

function battingOrder(
  teamA: TeamRef,
  teamB: TeamRef,
  tossWinnerTeamId: string,
  tossDecision: Decision,
): { battingFirst: TeamRef; bowlingFirst: TeamRef } {
  const otherId = tossWinnerTeamId === teamA.teamId ? teamB.teamId : teamA.teamId;
  const battingFirstId = tossDecision === "bat" ? tossWinnerTeamId : otherId;
  return battingFirstId === teamA.teamId
    ? { battingFirst: teamA, bowlingFirst: teamB }
    : { battingFirst: teamB, bowlingFirst: teamA };
}

export async function createLiveMatch(input: {
  tournamentId?: string;
  ownerId?: string;
  teamA: TeamRef;
  teamB: TeamRef;
  overs: number;
  venue?: string;
  date: string;
  /** Optional — many matches are scheduled ahead of time and the toss isn't
   * decided until the match actually starts (see `setMatchToss`). */
  tossWinnerTeamId?: string;
  tossDecision?: Decision;
}): Promise<LiveMatch> {
  const items = await readAll();
  const toss =
    input.tossWinnerTeamId && input.tossDecision
      ? { winnerTeamId: input.tossWinnerTeamId, decision: input.tossDecision }
      : undefined;
  // Without a toss yet, seed innings[0] with an arbitrary side batting first;
  // it's corrected by `setMatchToss` before the match can go live, so no
  // events depend on this placeholder in the meantime.
  const { battingFirst, bowlingFirst } = toss
    ? battingOrder(input.teamA, input.teamB, toss.winnerTeamId, toss.decision)
    : { battingFirst: input.teamA, bowlingFirst: input.teamB };

  const match: LiveMatch = {
    id: nextMatchId(items),
    tournamentId: input.tournamentId,
    ownerId: input.ownerId,
    teamA: input.teamA,
    teamB: input.teamB,
    overs: input.overs,
    venue: input.venue,
    date: input.date,
    toss,
    status: "scheduled",
    innings: [{ battingTeam: battingFirst, bowlingTeam: bowlingFirst, events: [] }],
    currentInnings: 0,
    createdAt: new Date().toISOString(),
  };
  items.push(match);
  await writeAll(items);
  return match;
}

export type SetTossResult = LiveMatch | "not-found" | "already-set" | "already-started";

/** Decides the toss once the match is about to start (see canScoreLiveMatch
 * for who may call this). Only allowed before any ball has been bowled,
 * since it corrects which side bats/bowls first in innings[0]. */
export async function setMatchToss(
  id: string,
  tossWinnerTeamId: string,
  tossDecision: Decision,
): Promise<SetTossResult> {
  const items = await readAll();
  const index = items.findIndex((m) => m.id === id);
  if (index === -1) return "not-found";
  const match = items[index];
  if (match.toss) return "already-set";
  if (match.status !== "scheduled" || match.innings[0].events.length > 0) {
    return "already-started";
  }
  const { battingFirst, bowlingFirst } = battingOrder(
    match.teamA,
    match.teamB,
    tossWinnerTeamId,
    tossDecision,
  );
  match.toss = { winnerTeamId: tossWinnerTeamId, decision: tossDecision };
  match.innings[0] = { battingTeam: battingFirst, bowlingTeam: bowlingFirst, events: [] };
  await writeAll(items);
  return match;
}

export function canManageLiveMatch(
  match: Pick<LiveMatch, "tournamentId" | "ownerId">,
  user: { id: string; isAdmin: boolean },
  tournamentOrganizerId?: string,
): boolean {
  // New matches are controlled by their creator. Legacy matches without an
  // owner remain manageable by the tournament organizer.
  return (
    user.isAdmin ||
    match.ownerId === user.id ||
    (!match.ownerId && !!tournamentOrganizerId && tournamentOrganizerId === user.id)
  );
}

/**
 * Scorers may score a match (record deliveries, undo, complete it) without
 * being the owner/organizer/admin. This is intentionally narrower than
 * `canManageLiveMatch` — scorers cannot reschedule, delete, or otherwise
 * manage the match, only perform scoring-related actions.
 */
export function canScoreLiveMatch(
  match: Pick<LiveMatch, "tournamentId" | "ownerId" | "scorers">,
  user: { id: string; isAdmin: boolean },
  tournamentOrganizerId?: string,
  tournamentScorers?: Scorer[],
): boolean {
  return (
    canManageLiveMatch(match, user, tournamentOrganizerId) ||
    isScorer(match.scorers, user.id) ||
    isScorer(tournamentScorers, user.id)
  );
}

export type ScorerMutationResult = LiveMatch | "not-found" | "already-scorer";

export async function addLiveMatchScorer(
  id: string,
  scorer: { userId: string; name: string; mobile: string },
): Promise<ScorerMutationResult> {
  const items = await readAll();
  const index = items.findIndex((m) => m.id === id);
  if (index === -1) return "not-found";
  const match = items[index];
  if (isScorer(match.scorers, scorer.userId)) return "already-scorer";
  match.scorers = [...(match.scorers ?? []), { ...scorer, addedAt: new Date().toISOString() }];
  await writeAll(items);
  return match;
}

export async function removeLiveMatchScorer(
  id: string,
  userId: string,
): Promise<LiveMatch | "not-found"> {
  const items = await readAll();
  const index = items.findIndex((m) => m.id === id);
  if (index === -1) return "not-found";
  items[index].scorers = (items[index].scorers ?? []).filter((s) => s.userId !== userId);
  await writeAll(items);
  return items[index];
}

export async function applyEvent(
  id: string,
  event: ScoreEvent,
): Promise<LiveMatch | undefined> {
  const items = await readAll();
  const index = items.findIndex((m) => m.id === id);
  if (index === -1) return undefined;
  const match = items[index];
  if (match.status === "completed") return match;

  match.innings[match.currentInnings].events.push(event);
  if (match.status === "scheduled") match.status = "live";

  // First innings ended → open the second innings with sides swapped.
  if (
    event.t === "endInnings" &&
    match.currentInnings === 0 &&
    match.innings.length === 1
  ) {
    const first = match.innings[0];
    match.innings.push({
      battingTeam: first.bowlingTeam,
      bowlingTeam: first.battingTeam,
      events: [],
    });
    match.currentInnings = 1;
  }

  await writeAll(items);
  return match;
}

export async function undoLast(id: string): Promise<LiveMatch | undefined> {
  const items = await readAll();
  const index = items.findIndex((m) => m.id === id);
  if (index === -1) return undefined;
  const match = items[index];

  const current = match.innings[match.currentInnings];
  if (current.events.length > 0) {
    current.events.pop();
  } else if (match.currentInnings > 0) {
    match.innings.pop();
    match.currentInnings -= 1;
    const prev = match.innings[match.currentInnings];
    if (prev.events[prev.events.length - 1]?.t === "endInnings") prev.events.pop();
  }

  if (match.status === "completed") match.status = "live";
  match.result = undefined;
  match.playerOfTheMatch = undefined;
  await writeAll(items);
  return match;
}

export type CompleteResult =
  | { match: LiveMatch; scorecard: Match }
  | "not-ready"
  | "not-found";

export async function completeLiveMatch(id: string): Promise<CompleteResult> {
  const items = await readAll();
  const index = items.findIndex((m) => m.id === id);
  if (index === -1) return "not-found";
  const match = items[index];

  const computed = computeMatch(match);
  if (!computed.canComplete) return "not-ready";

  match.result = computed.result;
  match.status = "completed";
  match.playerOfTheMatch = pickPlayerOfTheMatch(computed);

  const scorecard = buildMatchScorecard(match, computed);
  await writeAll(items);
  if (match.tournamentId) await addMatchToTournament(match.tournamentId, scorecard);
  return { match, scorecard };
}

/** Completed matches that aren't attached to any tournament (created from
 * `/matches/new` as a standalone match). Their scorecards live only on the
 * `LiveMatch` record, so they're rebuilt on demand here rather than being
 * duplicated into tournament storage — used by stats.ts so standalone
 * matches count toward rankings/performance just like tournament matches. */
export async function listCompletedStandaloneMatches(): Promise<Match[]> {
  const items = await readAll();
  return items
    .filter((m) => !m.tournamentId && m.status === "completed")
    .map((m) => buildMatchScorecard(m, computeMatch(m)));
}

/** Builds the persisted scorecard shape (`Match`) from a live match and its
 * computed innings state. Used both when completing a tournament match
 * (persisted onto the tournament) and on-demand for standalone matches. */
export function buildMatchScorecard(
  match: LiveMatch,
  computed: ComputedMatch,
): Match {
  const states = computed.innings.filter(Boolean) as InningsState[];
  const nameOf = (id: string): string =>
    [...match.teamA.players, ...match.teamB.players].find(
      (p) => p.playerId === id,
    )?.name ?? id;

  return {
    id: match.id,
    date: match.date,
    teamA: states[0]?.battingTeam.name ?? match.teamA.name,
    teamB: states[1]?.battingTeam.name ?? match.teamB.name,
    status: "completed",
    result: match.result,
    playerOfTheMatch: match.playerOfTheMatch,
    innings: states.map((s) => ({
      team: s.battingTeam.name,
      runs: s.runs,
      wickets: s.wickets,
      overs: Number(s.oversText),
      batting: s.batters.map((b) => ({
        playerId: b.playerId,
        name: b.name,
        how: b.how,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
      })),
      bowling: s.bowlers.map((b) => ({
        playerId: b.playerId,
        name: b.name,
        overs: Number(ballsToOvers(b.legalBalls)),
        maidens: b.maidens,
        runs: b.runs,
        wickets: b.wickets,
      })),
      fielding: s.fielding.map((f) => ({
        playerId: f.playerId,
        name: nameOf(f.playerId),
        catches: f.catches,
        stumpings: f.stumpings,
        runOuts: f.runOuts,
      })),
    })),
  };
}

function pickPlayerOfTheMatch(computed: ComputedMatch): string | undefined {
  const points = new Map<string, { name: string; pts: number }>();
  const add = (id: string, name: string, pts: number) => {
    const cur = points.get(id) ?? { name, pts: 0 };
    cur.pts += pts;
    points.set(id, cur);
  };
  for (const s of computed.innings) {
    if (!s) continue;
    for (const b of s.batters) add(b.playerId, b.name, b.runs + b.fours + b.sixes * 2);
    for (const b of s.bowlers) add(b.playerId, b.name, b.wickets * 20 + b.maidens * 5);
    for (const f of s.fielding)
      add(f.playerId, "", f.catches * 8 + f.stumpings * 12 + f.runOuts * 8);
  }
  let best: { name: string; pts: number } | undefined;
  for (const v of points.values()) {
    if (v.name && (!best || v.pts > best.pts)) best = v;
  }
  return best?.name;
}

// Sequential ids: LM-001, LM-002, …
function nextMatchId(items: LiveMatch[]): string {
  const max = items.reduce((acc, m) => {
    const match = /^LM-(\d+)$/.exec(m.id);
    const n = match ? Number(match[1]) : 0;
    return n > acc ? n : acc;
  }, 0);
  return `LM-${String(max + 1).padStart(3, "0")}`;
}
