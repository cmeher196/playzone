import { listTournaments } from "./tournaments";
import { listPlayers } from "./registrations";
import { computePoints, pointsPerMatch } from "./rating";

export interface PlayerStats {
  matches: number;
  battingInnings: number;
  runs: number;
  balls: number;
  notOuts: number;
  fours: number;
  sixes: number;
  highScore: number;
  battingAverage: number | null;
  strikeRate: number | null;
  bowlingInnings: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  maidens: number;
  bestBowling: string;
  economy: number | null;
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface RecentMatch {
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  date: string;
  teamA: string;
  teamB: string;
  result?: string;
  batting?: { runs: number; balls: number; how: string };
  bowling?: { wickets: number; runs: number; overs: number };
}

// Overs are stored as e.g. 3.4 = 3 overs and 4 balls.
function oversToBalls(overs: number): number {
  const whole = Math.floor(overs);
  const balls = Math.round((overs - whole) * 10);
  return whole * 6 + balls;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyStats(): PlayerStats {
  return {
    matches: 0,
    battingInnings: 0,
    runs: 0,
    balls: 0,
    notOuts: 0,
    fours: 0,
    sixes: 0,
    highScore: 0,
    battingAverage: null,
    strikeRate: null,
    bowlingInnings: 0,
    wickets: 0,
    ballsBowled: 0,
    runsConceded: 0,
    maidens: 0,
    bestBowling: "—",
    economy: null,
    catches: 0,
    stumpings: 0,
    runOuts: 0,
  };
}

export async function getPlayerPerformance(
  playerId: string,
): Promise<{ stats: PlayerStats; recent: RecentMatch[] }> {
  const tournaments = await listTournaments();
  const stats = emptyStats();
  const recent: RecentMatch[] = [];
  let bestWickets = -1;
  let bestRuns = Number.POSITIVE_INFINITY;

  for (const t of tournaments) {
    for (const m of t.matches ?? []) {
      if (m.status !== "completed") continue;
      let played = false;
      let battingLine: RecentMatch["batting"];
      let bowlingLine: RecentMatch["bowling"];

      for (const inn of m.innings) {
        const bat = inn.batting.find((b) => b.playerId === playerId);
        if (bat) {
          played = true;
          stats.battingInnings += 1;
          stats.runs += bat.runs;
          stats.balls += bat.balls;
          stats.fours += bat.fours;
          stats.sixes += bat.sixes;
          if (bat.how === "not out") stats.notOuts += 1;
          if (bat.runs > stats.highScore) stats.highScore = bat.runs;
          battingLine = { runs: bat.runs, balls: bat.balls, how: bat.how };
        }

        const bowl = inn.bowling.find((b) => b.playerId === playerId);
        if (bowl) {
          played = true;
          stats.bowlingInnings += 1;
          stats.wickets += bowl.wickets;
          stats.ballsBowled += oversToBalls(bowl.overs);
          stats.runsConceded += bowl.runs;
          stats.maidens += bowl.maidens;
          if (
            bowl.wickets > bestWickets ||
            (bowl.wickets === bestWickets && bowl.runs < bestRuns)
          ) {
            bestWickets = bowl.wickets;
            bestRuns = bowl.runs;
            stats.bestBowling = `${bowl.wickets}/${bowl.runs}`;
          }
          bowlingLine = {
            wickets: bowl.wickets,
            runs: bowl.runs,
            overs: bowl.overs,
          };
        }

        for (const f of inn.fielding ?? []) {
          if (f.playerId === playerId) {
            played = true;
            stats.catches += f.catches ?? 0;
            stats.stumpings += f.stumpings ?? 0;
            stats.runOuts += f.runOuts ?? 0;
          }
        }
      }

      if (played) {
        stats.matches += 1;
        recent.push({
          tournamentId: t.id,
          tournamentName: t.name,
          matchId: m.id,
          date: m.date,
          teamA: m.teamA,
          teamB: m.teamB,
          result: m.result,
          batting: battingLine,
          bowling: bowlingLine,
        });
      }
    }
  }

  const dismissals = stats.battingInnings - stats.notOuts;
  stats.battingAverage = dismissals > 0 ? round(stats.runs / dismissals) : null;
  stats.strikeRate =
    stats.balls > 0 ? round((stats.runs / stats.balls) * 100) : null;
  stats.economy =
    stats.ballsBowled > 0
      ? round(stats.runsConceded / (stats.ballsBowled / 6))
      : null;

  recent.sort((a, b) => b.date.localeCompare(a.date));
  return { stats, recent };
}

export interface PlayerAggregate {
  id: string;
  name: string;
  playerType: string;
  role?: string;
  stats: PlayerStats;
  points: number;
  ppm: number;
}

/** One efficient pass over every completed match, aggregated per player. */
export async function getLeaderboardData(): Promise<PlayerAggregate[]> {
  const [tournaments, players] = await Promise.all([
    listTournaments(),
    listPlayers(),
  ]);

  const statsById = new Map<string, PlayerStats>();
  const bestById = new Map<string, { w: number; r: number }>();
  const ensure = (id: string): PlayerStats => {
    let s = statsById.get(id);
    if (!s) {
      s = emptyStats();
      statsById.set(id, s);
    }
    return s;
  };

  for (const t of tournaments) {
    for (const m of t.matches ?? []) {
      if (m.status !== "completed") continue;
      const played = new Set<string>();
      for (const inn of m.innings) {
        for (const b of inn.batting) {
          if (!b.playerId) continue;
          const s = ensure(b.playerId);
          s.battingInnings += 1;
          s.runs += b.runs;
          s.balls += b.balls;
          s.fours += b.fours;
          s.sixes += b.sixes;
          if (b.how === "not out") s.notOuts += 1;
          if (b.runs > s.highScore) s.highScore = b.runs;
          played.add(b.playerId);
        }
        for (const bo of inn.bowling) {
          if (!bo.playerId) continue;
          const s = ensure(bo.playerId);
          s.bowlingInnings += 1;
          s.wickets += bo.wickets;
          s.ballsBowled += oversToBalls(bo.overs);
          s.runsConceded += bo.runs;
          s.maidens += bo.maidens;
          const prev = bestById.get(bo.playerId);
          if (
            !prev ||
            bo.wickets > prev.w ||
            (bo.wickets === prev.w && bo.runs < prev.r)
          ) {
            bestById.set(bo.playerId, { w: bo.wickets, r: bo.runs });
          }
          played.add(bo.playerId);
        }
        for (const f of inn.fielding ?? []) {
          if (!f.playerId) continue;
          const s = ensure(f.playerId);
          s.catches += f.catches ?? 0;
          s.stumpings += f.stumpings ?? 0;
          s.runOuts += f.runOuts ?? 0;
          played.add(f.playerId);
        }
      }
      for (const id of played) ensure(id).matches += 1;
    }
  }

  return players.map((p) => {
    const s = statsById.get(p.id) ?? emptyStats();
    const best = bestById.get(p.id);
    if (best) s.bestBowling = `${best.w}/${best.r}`;
    const dismissals = s.battingInnings - s.notOuts;
    s.battingAverage = dismissals > 0 ? round(s.runs / dismissals) : null;
    s.strikeRate = s.balls > 0 ? round((s.runs / s.balls) * 100) : null;
    s.economy =
      s.ballsBowled > 0 ? round(s.runsConceded / (s.ballsBowled / 6)) : null;
    const points = computePoints(s);
    return {
      id: p.id,
      name: p.name,
      playerType: p.playerType,
      role: p.role,
      stats: s,
      points,
      ppm: pointsPerMatch(points, s.matches),
    };
  });
}
