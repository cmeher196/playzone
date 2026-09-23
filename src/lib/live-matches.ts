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

export async function createLiveMatch(input: {
  tournamentId: string;
  teamA: TeamRef;
  teamB: TeamRef;
  overs: number;
  venue?: string;
  date: string;
  tossWinnerTeamId: string;
  tossDecision: Decision;
}): Promise<LiveMatch> {
  const items = await readAll();
  const otherId =
    input.tossWinnerTeamId === input.teamA.teamId
      ? input.teamB.teamId
      : input.teamA.teamId;
  const battingFirstId =
    input.tossDecision === "bat" ? input.tossWinnerTeamId : otherId;
  const battingFirst =
    battingFirstId === input.teamA.teamId ? input.teamA : input.teamB;
  const bowlingFirst =
    battingFirstId === input.teamA.teamId ? input.teamB : input.teamA;

  const match: LiveMatch = {
    id: nextMatchId(items),
    tournamentId: input.tournamentId,
    teamA: input.teamA,
    teamB: input.teamB,
    overs: input.overs,
    venue: input.venue,
    date: input.date,
    toss: { winnerTeamId: input.tossWinnerTeamId, decision: input.tossDecision },
    status: "scheduled",
    innings: [{ battingTeam: battingFirst, bowlingTeam: bowlingFirst, events: [] }],
    currentInnings: 0,
    createdAt: new Date().toISOString(),
  };
  items.push(match);
  await writeAll(items);
  return match;
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

  const scorecard = buildTournamentMatch(match, computed);
  await writeAll(items);
  await addMatchToTournament(match.tournamentId, scorecard);
  return { match, scorecard };
}

function buildTournamentMatch(
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
