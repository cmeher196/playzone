// One-off generator: appends random LiveMatch entries to data/live-matches.json
// so the "My Matches" view has more content. Mirrors the live-scoring engine's
// crease/strike/over/wicket rules so computeMatch() derives correct scorecards.
// Existing matches are never modified — new ones are appended with fresh LM ids.
// Run from the cricarena/ folder:  node scripts/gen-matches.mjs [count]
import { promises as fs } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const liveFile = path.join(dataDir, "live-matches.json");
const regFile = path.join(dataDir, "registrations.json");

const TOURNAMENT_ID = "T-DEMO";
const TEAM_NAMES = [
  "Royal Strikers", "Metro Warriors", "Coastal Kings", "Desert Chargers",
  "Highland Panthers", "Urban Titans", "Sunrise Royals", "Thunder Blasters",
  "Emerald Eagles", "Crimson Lions", "Golden Falcons", "Silver Sharks",
];
const VENUES = [
  "Wankhede Maidan, Mumbai", "Shivaji Park, Mumbai", "Chinnaswamy Ground, Bengaluru",
  "Eden Gardens Nets, Kolkata", "Gymkhana Oval, Pune", "Civil Lines, Delhi",
];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
function sample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Weighted runs off the bat for a normal delivery.
function weightedRuns() {
  const r = Math.random();
  if (r < 0.34) return 0;
  if (r < 0.64) return 1;
  if (r < 0.76) return 2;
  if (r < 0.79) return 3;
  if (r < 0.92) return 4;
  return 6;
}

// Simulate one innings, emitting a valid event stream. Tracks the crease exactly
// like reduceInnings so wicket.dismissedId always matches the batter on strike.
function genInnings(batting, bowling, overs, { target = null, close = true, maxOvers = overs } = {}) {
  const events = [];
  const bats = batting.players.map((p) => p.playerId);
  const bowls = bowling.players.map((p) => p.playerId);
  const squad = bats.length;

  let striker = bats[0];
  let nonStriker = bats[1];
  let nextIdx = 2;
  events.push({ t: "openers", strikerId: striker, nonStrikerId: nonStriker });

  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let allOut = false;
  let chased = false;
  const swap = () => { const t = striker; striker = nonStriker; nonStriker = t; };

  outer: for (let over = 0; over < maxOvers; over++) {
    events.push({ t: "bowler", bowlerId: pick(bowls) });
    let ballsThisOver = 0;
    while (ballsThisOver < 6) {
      if (striker == null || nonStriker == null) {
        if (nextIdx < squad) {
          const nb = bats[nextIdx++];
          events.push({ t: "newBatter", batterId: nb });
          if (striker == null) striker = nb; else nonStriker = nb;
        } else { allOut = true; break outer; }
      }
      if (target != null && runs >= target) { chased = true; break outer; }

      const canWicket = wickets < squad - 1;
      if (canWicket && Math.random() < 0.11) {
        const type = pick(["bowled", "caught", "lbw", "caught", "bowled", "run-out"]);
        const w = { type, dismissedId: striker };
        if (type === "caught" || type === "run-out") w.fielderId = pick(bowls);
        events.push({ t: "ball", runs: 0, wicket: w });
        wickets += 1;
        legalBalls += 1;
        ballsThisOver += 1;
        striker = null;
        if (wickets >= squad - 1) { allOut = true; break outer; }
        if (ballsThisOver === 6) swap();
        continue;
      }

      const r = weightedRuns();
      events.push({ t: "ball", runs: r });
      runs += r;
      legalBalls += 1;
      ballsThisOver += 1;
      if (r % 2 === 1) swap();
      if (ballsThisOver === 6) swap();
      if (target != null && runs >= target) { chased = true; break outer; }
    }
  }

  if (close) events.push({ t: "endInnings" });
  return { events, runs, wickets, legalBalls, allOut, chased };
}

function resultText(first, second, r1, r2, w2) {
  const target = r1 + 1;
  if (r2 >= target) {
    const left = second.players.length - 1 - w2;
    return `${second.name} won by ${left} wicket${left === 1 ? "" : "s"}`;
  }
  if (r2 === target - 1) return "Match tied";
  const margin = target - 1 - r2;
  return `${first.name} won by ${margin} run${margin === 1 ? "" : "s"}`;
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeTeam(name, players, seq) {
  return { teamId: `TM-GEN-${seq}`, name, players };
}

function buildMatch(id, players, seq, status) {
  const overs = pick([5, 6, 8]);
  const [nameA, nameB] = sample(TEAM_NAMES, 2);
  const roster = sample(players, 12);
  const teamA = makeTeam(nameA, roster.slice(0, 6), `${seq}A`);
  const teamB = makeTeam(nameB, roster.slice(6, 12), `${seq}B`);

  const battingFirst = Math.random() < 0.5 ? teamA : teamB;
  const bowlingFirst = battingFirst === teamA ? teamB : teamA;
  const daysAgo = status === "scheduled" ? -rnd(14) - 1 : rnd(30);
  const date = dateNDaysAgo(daysAgo);
  const base = {
    id,
    tournamentId: TOURNAMENT_ID,
    teamA,
    teamB,
    overs,
    venue: pick(VENUES),
    date,
    toss: { winnerTeamId: battingFirst.teamId, decision: "bat" },
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  };

  if (status === "scheduled") {
    return {
      ...base,
      status: "scheduled",
      innings: [{ battingTeam: battingFirst, bowlingTeam: bowlingFirst, events: [] }],
      currentInnings: 0,
    };
  }

  if (status === "live") {
    const partial = Math.max(1, Math.min(overs - 1, 2 + rnd(2)));
    const inn = genInnings(battingFirst, bowlingFirst, overs, { close: false, maxOvers: partial });
    return {
      ...base,
      status: "live",
      innings: [{ battingTeam: battingFirst, bowlingTeam: bowlingFirst, events: inn.events }],
      currentInnings: 0,
    };
  }

  // completed
  const i1 = genInnings(battingFirst, bowlingFirst, overs);
  const i2 = genInnings(bowlingFirst, battingFirst, overs, { target: i1.runs + 1 });
  const result = resultText(battingFirst, bowlingFirst, i1.runs, i2.runs, i2.wickets);
  return {
    ...base,
    status: "completed",
    innings: [
      { battingTeam: battingFirst, bowlingTeam: bowlingFirst, events: i1.events },
      { battingTeam: bowlingFirst, bowlingTeam: battingFirst, events: i2.events },
    ],
    currentInnings: 1,
    result,
    playerOfTheMatch: pick((i2.runs >= i1.runs + 1 ? bowlingFirst : battingFirst).players).name,
  };
}

function nextIdSeq(existing) {
  return existing.reduce((max, m) => {
    const mm = /^LM-(\d+)$/.exec(m.id);
    const n = mm ? Number(mm[1]) : 0;
    return n > max ? n : max;
  }, 0);
}

async function main() {
  const count = Number(process.argv[2]) || 8;
  const regs = JSON.parse(await fs.readFile(regFile, "utf8"));
  const players = regs
    .filter((r) => r.role !== "admin" && r.id && r.name)
    .map((r) => ({ playerId: r.id, name: r.name }));
  if (players.length < 12) {
    throw new Error(`Need at least 12 players, found ${players.length}.`);
  }

  const existing = JSON.parse(await fs.readFile(liveFile, "utf8"));
  let seq = nextIdSeq(existing);

  // A varied mix: mostly completed, a couple live, one upcoming.
  const statuses = [];
  for (let i = 0; i < count; i++) {
    statuses.push(i < count - 3 ? "completed" : i < count - 1 ? "live" : "scheduled");
  }

  const created = [];
  for (const status of statuses) {
    seq += 1;
    const id = `LM-${String(seq).padStart(3, "0")}`;
    created.push(buildMatch(id, players, seq, status));
  }

  const next = [...existing, ...created];
  await fs.writeFile(liveFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  console.log(`Added ${created.length} matches to ${path.relative(process.cwd(), liveFile)}:`);
  for (const m of created) {
    const line =
      m.status === "completed"
        ? `${m.result}`
        : m.status === "live"
          ? "in progress"
          : "scheduled";
    console.log(`  ${m.id}  [${m.status}]  ${m.teamA.name} vs ${m.teamB.name} — ${line}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
