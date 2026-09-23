import { computeMatch, type LiveMatch, type InningsState } from "./live-scoring";
import type { Team } from "./teams";

/**
 * League standings & fixtures. Standings are derived from completed live
 * matches (which carry team ids, innings runs and overs), so the table and NRR
 * always reflect actual results. Points rules are configurable here.
 */
export const POINTS = { win: 2, tie: 1, noResult: 1, loss: 0 };

export interface StandingRow {
  teamId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsScored: number;
  oversScored: number;
  runsConceded: number;
  oversConceded: number;
  nrr: number;
}

export interface Fixture {
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  match?: { id: string; status: LiveMatch["status"]; result?: string };
}

// For NRR: a side bowled out is charged the full over quota, not the overs used.
function oversForNrr(innings: InningsState, matchOvers: number): number {
  return innings.allOut ? matchOvers : innings.legalBalls / 6;
}

function emptyRow(team: Team): StandingRow {
  return {
    teamId: team.id,
    name: team.name,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    noResult: 0,
    points: 0,
    runsScored: 0,
    oversScored: 0,
    runsConceded: 0,
    oversConceded: 0,
    nrr: 0,
  };
}

export function computeStandings(
  teams: Team[],
  matches: LiveMatch[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const team of teams) rows.set(team.id, emptyRow(team));

  for (const match of matches) {
    if (match.status !== "completed") continue;
    const computed = computeMatch(match);
    const first = computed.innings[0];
    const second = computed.innings[1];
    if (!first || !second) continue;

    const firstRow = rows.get(first.battingTeam.teamId);
    const secondRow = rows.get(second.battingTeam.teamId);
    if (!firstRow || !secondRow) continue;

    firstRow.played += 1;
    secondRow.played += 1;

    const firstOvers = oversForNrr(first, match.overs);
    const secondOvers = oversForNrr(second, match.overs);
    firstRow.runsScored += first.runs;
    firstRow.oversScored += firstOvers;
    firstRow.runsConceded += second.runs;
    firstRow.oversConceded += secondOvers;
    secondRow.runsScored += second.runs;
    secondRow.oversScored += secondOvers;
    secondRow.runsConceded += first.runs;
    secondRow.oversConceded += firstOvers;

    if (first.runs === second.runs) {
      firstRow.tied += 1;
      secondRow.tied += 1;
      firstRow.points += POINTS.tie;
      secondRow.points += POINTS.tie;
    } else if (second.runs > first.runs) {
      secondRow.won += 1;
      firstRow.lost += 1;
      secondRow.points += POINTS.win;
    } else {
      firstRow.won += 1;
      secondRow.lost += 1;
      firstRow.points += POINTS.win;
    }
  }

  const table = [...rows.values()];
  for (const row of table) {
    const scoredRate = row.oversScored > 0 ? row.runsScored / row.oversScored : 0;
    const concededRate =
      row.oversConceded > 0 ? row.runsConceded / row.oversConceded : 0;
    row.nrr = Math.round((scoredRate - concededRate) * 1000) / 1000;
  }

  table.sort(
    (a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won,
  );
  return table;
}

/** Single round-robin: every team plays every other once. */
export function generateFixtures(
  teams: Team[],
  matches: LiveMatch[],
): Fixture[] {
  const fixtures: Fixture[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i];
      const b = teams[j];
      const match = matches.find(
        (m) =>
          (m.teamA.teamId === a.id && m.teamB.teamId === b.id) ||
          (m.teamA.teamId === b.id && m.teamB.teamId === a.id),
      );
      fixtures.push({
        teamAId: a.id,
        teamAName: a.name,
        teamBId: b.id,
        teamBName: b.name,
        match: match
          ? { id: match.id, status: match.status, result: match.result }
          : undefined,
      });
    }
  }
  return fixtures;
}
