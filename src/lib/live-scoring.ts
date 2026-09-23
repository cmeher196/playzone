/**
 * Live scoring engine (independent, reusable). Deliveries/events are the source
 * of truth; all scoreboard numbers are derived by replaying the event log, so
 * "undo" is just dropping the last event and recomputing.
 */

export type Decision = "bat" | "bowl";
export type ExtraType = "wide" | "no-ball" | "bye" | "leg-bye";
export type WicketType =
  | "bowled"
  | "caught"
  | "lbw"
  | "run-out"
  | "stumped"
  | "hit-wicket";

export interface PlayerRef {
  playerId: string;
  name: string;
}

export interface TeamRef {
  teamId: string;
  name: string;
  players: PlayerRef[];
}

export interface WicketInfo {
  type: WicketType;
  dismissedId: string;
  fielderId?: string;
}

export interface BallEvent {
  t: "ball";
  runs: number; // off the bat
  extraType?: ExtraType;
  extraRuns?: number; // additional ran runs (byes/leg-byes; extra ran on wide)
  wicket?: WicketInfo;
}
export interface OpenersEvent {
  t: "openers";
  strikerId: string;
  nonStrikerId: string;
}
export interface BowlerEvent {
  t: "bowler";
  bowlerId: string;
}
export interface NewBatterEvent {
  t: "newBatter";
  batterId: string;
}
export interface EndInningsEvent {
  t: "endInnings";
}
export type ScoreEvent =
  | BallEvent
  | OpenersEvent
  | BowlerEvent
  | NewBatterEvent
  | EndInningsEvent;

export interface StoredInnings {
  battingTeam: TeamRef;
  bowlingTeam: TeamRef;
  events: ScoreEvent[];
}

export interface LiveMatch {
  id: string;
  tournamentId: string;
  teamA: TeamRef;
  teamB: TeamRef;
  overs: number;
  venue?: string;
  date: string;
  toss: { winnerTeamId: string; decision: Decision };
  status: "scheduled" | "live" | "completed";
  innings: StoredInnings[];
  currentInnings: number;
  result?: string;
  playerOfTheMatch?: string;
  createdAt: string;
}

export interface BatterCard {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  how: string;
}
export interface BowlerCard {
  playerId: string;
  name: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
  wides: number;
  noBalls: number;
}
export interface FieldingTally {
  playerId: string;
  catches: number;
  stumpings: number;
  runOuts: number;
}
export interface CommentaryEntry {
  over: string;
  label: string;
  runs: number;
  wicket: boolean;
  text: string;
}
export interface OverSummary {
  over: number; // 0-based over index
  runs: number;
  wickets: number;
  balls: string[];
  bowlerName: string;
  score: string; // running team score at the end of the over
}

export interface InningsState {
  battingTeam: TeamRef;
  bowlingTeam: TeamRef;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversText: string;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  batters: BatterCard[];
  bowlers: BowlerCard[];
  fielding: FieldingTally[];
  extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number };
  partnership: { runs: number; balls: number };
  thisOver: string[];
  thisOverRuns: number;
  freeHit: boolean;
  commentary: CommentaryEntry[];
  overs: OverSummary[];
  closed: boolean;
  needOpeners: boolean;
  needBatter: boolean;
  needBowler: boolean;
  allOut: boolean;
  oversDone: boolean;
}

export function ballsToOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function dismissalText(w: WicketInfo, nameOf: (id: string) => string): string {
  const bowler = ""; // filled by caller context if needed
  switch (w.type) {
    case "bowled":
      return "bowled";
    case "lbw":
      return "lbw";
    case "hit-wicket":
      return "hit wicket";
    case "caught":
      return w.fielderId ? `c ${nameOf(w.fielderId)}` : "caught";
    case "stumped":
      return w.fielderId ? `st ${nameOf(w.fielderId)}` : "stumped";
    case "run-out":
      return w.fielderId ? `run out (${nameOf(w.fielderId)})` : "run out";
    default:
      return String(bowler);
  }
}

export function reduceInnings(
  stored: StoredInnings,
  oversLimit: number,
): InningsState {
  const batters = new Map<string, BatterCard>();
  const bowlers = new Map<string, BowlerCard>();
  const fielding = new Map<string, FieldingTally>();
  const order: string[] = [];

  const nameOf = (id: string): string =>
    stored.battingTeam.players.find((p) => p.playerId === id)?.name ??
    stored.bowlingTeam.players.find((p) => p.playerId === id)?.name ??
    id;

  const ensureBat = (id: string): BatterCard => {
    let b = batters.get(id);
    if (!b) {
      b = { playerId: id, name: nameOf(id), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: "not out" };
      batters.set(id, b);
      order.push(id);
    }
    return b;
  };
  const ensureBowl = (id: string): BowlerCard => {
    let b = bowlers.get(id);
    if (!b) {
      b = { playerId: id, name: nameOf(id), legalBalls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 };
      bowlers.set(id, b);
    }
    return b;
  };
  const addField = (id: string, kind: "catches" | "stumpings" | "runOuts") => {
    let f = fielding.get(id);
    if (!f) {
      f = { playerId: id, catches: 0, stumpings: 0, runOuts: 0 };
      fielding.set(id, f);
    }
    f[kind] += 1;
  };

  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let ballsThisOver = 0;
  let overRunsBowler = 0;
  let thisOver: string[] = [];
  let thisOverRuns = 0;
  let freeHitActive = false;
  const commentary: CommentaryEntry[] = [];
  const overSummaries: OverSummary[] = [];
  let strikerId: string | undefined;
  let nonStrikerId: string | undefined;
  let bowlerId: string | undefined;
  let partRuns = 0;
  let partBalls = 0;
  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
  let needBatter = false;
  let needBowler = false;
  let closed = false;

  const swap = () => {
    const tmp = strikerId;
    strikerId = nonStrikerId;
    nonStrikerId = tmp;
  };

  for (const ev of stored.events) {
    if (ev.t === "openers") {
      strikerId = ev.strikerId;
      nonStrikerId = ev.nonStrikerId;
      ensureBat(ev.strikerId);
      ensureBat(ev.nonStrikerId);
      partRuns = 0;
      partBalls = 0;
    } else if (ev.t === "bowler") {
      bowlerId = ev.bowlerId;
      ensureBowl(ev.bowlerId);
      needBowler = false;
      ballsThisOver = 0;
      overRunsBowler = 0;
      thisOver = [];
      thisOverRuns = 0;
    } else if (ev.t === "newBatter") {
      ensureBat(ev.batterId);
      if (!strikerId) strikerId = ev.batterId;
      else if (!nonStrikerId) nonStrikerId = ev.batterId;
      needBatter = false;
    } else if (ev.t === "endInnings") {
      closed = true;
    } else if (ev.t === "ball") {
      if (closed || needBatter || needBowler || !strikerId || !nonStrikerId || !bowlerId) {
        continue;
      }
      const striker = ensureBat(strikerId);
      const bowler = ensureBowl(bowlerId);
      const isFreeHit = freeHitActive;
      const overLabel = `${Math.floor(legalBalls / 6)}.${(legalBalls % 6) + 1}`;
      const overIndex = Math.floor(legalBalls / 6);
      const strikerName = striker.name;
      const bowlerName = bowler.name;
      const et = ev.extraType;
      const batRuns = ev.runs ?? 0;
      const extraRan = ev.extraRuns ?? 0;
      let legal = true;
      let faced = true;
      let charge = 0;
      let teamAdd = 0;
      let running = 0;

      if (et === "wide") {
        legal = false;
        faced = false;
        teamAdd = 1 + extraRan;
        charge = 1 + extraRan;
        running = extraRan;
        extras.wides += 1 + extraRan;
        bowler.wides += 1;
      } else if (et === "no-ball") {
        legal = false;
        faced = true;
        teamAdd = 1 + batRuns;
        charge = 1 + batRuns;
        running = batRuns;
        extras.noBalls += 1;
        bowler.noBalls += 1;
        striker.runs += batRuns;
        if (batRuns === 4) striker.fours += 1;
        if (batRuns === 6) striker.sixes += 1;
      } else if (et === "bye") {
        teamAdd = extraRan;
        running = extraRan;
        extras.byes += extraRan;
      } else if (et === "leg-bye") {
        teamAdd = extraRan;
        running = extraRan;
        extras.legByes += extraRan;
      } else {
        teamAdd = batRuns;
        charge = batRuns;
        running = batRuns;
        striker.runs += batRuns;
        if (batRuns === 4) striker.fours += 1;
        if (batRuns === 6) striker.sixes += 1;
      }

      runs += teamAdd;
      bowler.runs += charge;
      overRunsBowler += charge;
      thisOverRuns += teamAdd;
      if (faced) striker.balls += 1;
      partRuns += teamAdd;
      if (legal) {
        legalBalls += 1;
        ballsThisOver += 1;
        bowler.legalBalls += 1;
        partBalls += 1;
      }
      if (running % 2 === 1) swap();

      // On a free hit only a run-out counts as a dismissal.
      let dismissed = false;
      if (ev.wicket && (!isFreeHit || ev.wicket.type === "run-out")) {
        const w = ev.wicket;
        const d = ensureBat(w.dismissedId);
        d.out = true;
        d.how = dismissalText(w, nameOf);
        wickets += 1;
        if (w.type !== "run-out") bowler.wickets += 1;
        if (w.fielderId) {
          if (w.type === "caught") addField(w.fielderId, "catches");
          else if (w.type === "stumped") addField(w.fielderId, "stumpings");
          else if (w.type === "run-out") addField(w.fielderId, "runOuts");
        }
        if (strikerId === w.dismissedId) strikerId = undefined;
        else if (nonStrikerId === w.dismissedId) nonStrikerId = undefined;
        needBatter = true;
        partRuns = 0;
        partBalls = 0;
        dismissed = true;
      }

      // A no-ball makes the next delivery a free hit; a legal ball consumes it.
      if (et === "no-ball") freeHitActive = true;
      else if (legal) freeHitActive = false;

      let label: string;
      let outcome: string;
      if (dismissed) {
        label = "W";
        outcome = `OUT! ${ev.wicket ? dismissalText(ev.wicket, nameOf) : ""}`.trim();
      } else if (et === "wide") {
        const total = 1 + extraRan;
        label = total > 1 ? `${total}wd` : "wd";
        outcome = total > 1 ? `${total} wides` : "wide";
      } else if (et === "no-ball") {
        label = batRuns > 0 ? `${batRuns}nb` : "nb";
        outcome =
          batRuns > 0
            ? `no ball, ${batRuns} run${batRuns > 1 ? "s" : ""} off the bat`
            : "no ball";
      } else if (et === "bye") {
        label = `${extraRan}b`;
        outcome = `${extraRan} bye${extraRan > 1 ? "s" : ""}`;
      } else if (et === "leg-bye") {
        label = `${extraRan}lb`;
        outcome = `${extraRan} leg bye${extraRan > 1 ? "s" : ""}`;
      } else if (ev.wicket && isFreeHit) {
        label = String(batRuns);
        outcome = `${batRuns === 0 ? "no run" : `${batRuns} run${batRuns > 1 ? "s" : ""}`} — free hit, not out!`;
      } else {
        label = String(batRuns);
        outcome =
          batRuns === 0
            ? "no run"
            : batRuns === 4
              ? "FOUR"
              : batRuns === 6
                ? "SIX"
                : `${batRuns} run${batRuns > 1 ? "s" : ""}`;
      }
      if (isFreeHit && et !== "no-ball" && !dismissed) {
        outcome = `(free hit) ${outcome}`;
      }
      thisOver.push(label);
      commentary.push({
        over: overLabel,
        label,
        runs: teamAdd,
        wicket: dismissed,
        text: `${bowlerName} to ${strikerName}, ${outcome}`,
      });
      let curOver = overSummaries[overSummaries.length - 1];
      if (!curOver || curOver.over !== overIndex) {
        curOver = { over: overIndex, runs: 0, wickets: 0, balls: [], bowlerName, score: "" };
        overSummaries.push(curOver);
      }
      curOver.balls.push(label);
      curOver.runs += teamAdd;
      if (dismissed) curOver.wickets += 1;
      curOver.score = `${runs}/${wickets}`;

      if (legal && ballsThisOver === 6) {
        if (overRunsBowler === 0) bowler.maidens += 1;
        swap();
        needBowler = true;
      }
    }
  }

  extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes;
  const squad = stored.battingTeam.players.length;
  const allOut = squad > 1 && wickets >= squad - 1;
  const oversDone = legalBalls >= oversLimit * 6;
  const hasOpeners = stored.events.some((e) => e.t === "openers");
  // A bowler is required once openers are in (before the first ball) or when an
  // over has just finished — otherwise deliveries would be rejected.
  const needBowlerNow =
    !closed &&
    hasOpeners &&
    !needBatter &&
    strikerId != null &&
    nonStrikerId != null &&
    (needBowler || bowlerId == null);

  return {
    battingTeam: stored.battingTeam,
    bowlingTeam: stored.bowlingTeam,
    runs,
    wickets,
    legalBalls,
    oversText: ballsToOvers(legalBalls),
    strikerId,
    nonStrikerId,
    bowlerId,
    batters: order.map((id) => batters.get(id)!),
    bowlers: [...bowlers.values()],
    fielding: [...fielding.values()],
    extras,
    partnership: { runs: partRuns, balls: partBalls },
    thisOver,
    thisOverRuns,
    freeHit: freeHitActive,
    commentary,
    overs: overSummaries,
    closed,
    needOpeners: !hasOpeners,
    needBatter,
    needBowler: needBowlerNow,
    allOut,
    oversDone,
  };
}

export interface ComputedMatch {
  innings: (InningsState | undefined)[];
  currentInnings: number;
  target?: number;
  crr: number | null;
  rrr: number | null;
  runsToWin?: number;
  ballsRemaining?: number;
  canComplete: boolean;
  result?: string;
}

function rate(runs: number, balls: number): number | null {
  return balls > 0 ? Math.round((runs / (balls / 6)) * 100) / 100 : null;
}

export function computeMatch(match: LiveMatch): ComputedMatch {
  const states = match.innings.map((inn) => reduceInnings(inn, match.overs));
  const first = states[0];
  const second = states[1];
  const cur = match.currentInnings;
  const curState = states[cur];

  const target = first ? first.runs + 1 : undefined;
  const crr = curState ? rate(curState.runs, curState.legalBalls) : null;

  let rrr: number | null = null;
  let runsToWin: number | undefined;
  let ballsRemaining: number | undefined;
  if (cur === 1 && second && target !== undefined) {
    runsToWin = Math.max(0, target - second.runs);
    ballsRemaining = match.overs * 6 - second.legalBalls;
    rrr =
      ballsRemaining > 0
        ? Math.round((runsToWin / (ballsRemaining / 6)) * 100) / 100
        : null;
  }

  const inningsOver = (s: InningsState | undefined): boolean =>
    !!s && (s.closed || s.allOut || s.oversDone);

  let result: string | undefined;
  let canComplete = false;
  if (cur === 1 && second && target !== undefined) {
    const chasedDown = second.runs >= target;
    if (chasedDown) {
      const wktsLeft = second.battingTeam.players.length - 1 - second.wickets;
      result = `${second.battingTeam.name} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
      canComplete = true;
    } else if (inningsOver(second)) {
      if (second.runs === target - 1) {
        result = "Match tied";
      } else {
        const margin = target - 1 - second.runs;
        result = `${first!.battingTeam.name} won by ${margin} run${margin === 1 ? "" : "s"}`;
      }
      canComplete = true;
    }
  }

  return {
    innings: states,
    currentInnings: cur,
    target,
    crr,
    rrr,
    runsToWin,
    ballsRemaining,
    canComplete,
    result,
  };
}
