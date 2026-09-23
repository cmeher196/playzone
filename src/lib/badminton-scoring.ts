export type BadmintonParticipant = { id: string; name: string };
export type BadmintonEventType = "mens-singles" | "womens-singles" | "mens-doubles" | "womens-doubles" | "mixed-doubles";
export type BadmintonMatchStatus = "scheduled" | "ready" | "live" | "completed" | "walkover" | "retired" | "cancelled" | "postponed";

export interface BadmintonRules {
  bestOf: 1 | 3 | 5;
  pointsToWin: number;
  winBy: number;
  maxPoints: number;
}

export const DEFAULT_BADMINTON_RULES: BadmintonRules = {
  bestOf: 3,
  pointsToWin: 21,
  winBy: 2,
  maxPoints: 30,
};

export interface BadmintonGame {
  participant1: number;
  participant2: number;
  winnerId?: string;
  completed: boolean;
}

export interface BadmintonScoreState {
  participant1: BadmintonParticipant;
  participant2: BadmintonParticipant;
  rules: BadmintonRules;
  games: BadmintonGame[];
  currentGame: number;
  status: "scheduled" | "live" | "completed";
  winnerId?: string;
  events: BadmintonPointEvent[];
}

export type BadmintonPointEvent = { type: "point"; winnerId: string };

function gameWinner(game: BadmintonGame, rules: BadmintonRules): 1 | 2 | undefined {
  const high = Math.max(game.participant1, game.participant2);
  const difference = Math.abs(game.participant1 - game.participant2);
  if (high < rules.pointsToWin) return undefined;
  // At the cap, 30-29 wins even though the normal two-point margin is not met.
  if (high === rules.maxPoints) {
    return game.participant1 > game.participant2 ? 1 : 2;
  }
  if (difference < rules.winBy) return undefined;
  return game.participant1 > game.participant2 ? 1 : 2;
}

function gamesNeeded(rules: BadmintonRules): number {
  return Math.ceil(rules.bestOf / 2);
}

export function createBadmintonScoreState(
  participant1: BadmintonParticipant,
  participant2: BadmintonParticipant,
  rules: BadmintonRules = DEFAULT_BADMINTON_RULES,
): BadmintonScoreState {
  return {
    participant1,
    participant2,
    rules,
    games: [{ participant1: 0, participant2: 0, completed: false }],
    currentGame: 0,
    status: "scheduled",
    events: [],
  };
}

export function reduceBadmintonScore(state: BadmintonScoreState): BadmintonScoreState {
  const next = {
    ...state,
    games: state.games.map((game) => ({ ...game })),
    events: [...state.events],
  };
  next.games = [{ participant1: 0, participant2: 0, completed: false }];
  next.currentGame = 0;
  next.status = "scheduled";
  next.winnerId = undefined;

  for (const event of state.events) {
    if (event.type !== "point") continue;
    const game = next.games[next.currentGame];
    if (!game || next.status === "completed") continue;
    if (event.winnerId !== next.participant1.id && event.winnerId !== next.participant2.id) {
      throw new Error("Point winner is not a participant");
    }
    next.status = "live";
    if (event.winnerId === next.participant1.id) game.participant1 += 1;
    else game.participant2 += 1;
    const winner = gameWinner(game, next.rules);
    if (!winner) continue;
    game.completed = true;
    game.winnerId = winner === 1 ? next.participant1.id : next.participant2.id;
    const p1Games = next.games.filter((item) => item.winnerId === next.participant1.id).length;
    const p2Games = next.games.filter((item) => item.winnerId === next.participant2.id).length;
    if (p1Games >= gamesNeeded(next.rules) || p2Games >= gamesNeeded(next.rules)) {
      next.status = "completed";
      next.winnerId = p1Games > p2Games ? next.participant1.id : next.participant2.id;
    } else {
      next.currentGame += 1;
      next.games.push({ participant1: 0, participant2: 0, completed: false });
    }
  }
  return next;
}

export function addBadmintonPoint(state: BadmintonScoreState, winnerId: string): BadmintonScoreState {
  if (state.status === "completed") throw new Error("Completed matches cannot receive points");
  if (winnerId !== state.participant1.id && winnerId !== state.participant2.id) throw new Error("Point winner is not a participant");
  return reduceBadmintonScore({ ...state, events: [...state.events, { type: "point", winnerId }] });
}

export function undoBadmintonPoint(state: BadmintonScoreState): BadmintonScoreState {
  if (state.events.length === 0) throw new Error("There are no points to undo");
  return reduceBadmintonScore({ ...state, events: state.events.slice(0, -1) });
}

export function correctBadmintonScore(state: BadmintonScoreState, events: BadmintonPointEvent[]): BadmintonScoreState {
  return reduceBadmintonScore({ ...state, events: [...events] });
}

export function validateBadmintonState(state: BadmintonScoreState): string[] {
  const errors: string[] = [];
  for (const game of state.games) {
    if (game.participant1 < 0 || game.participant2 < 0) errors.push("Scores cannot be negative");
    if (!game.completed && gameWinner(game, state.rules)) errors.push("A completed game must be closed");
    if (game.completed && !gameWinner(game, state.rules)) errors.push("Completed game has an invalid score");
  }
  if (state.status === "completed" && !state.winnerId) errors.push("Completed match must have a winner");
  return errors;
}