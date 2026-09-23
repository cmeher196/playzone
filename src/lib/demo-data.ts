import {
  getTournament,
  deleteTournament,
  insertTournament,
  type Match,
  type Tournament,
} from "./tournaments";

/**
 * Seeds a read-only demo tournament ("CricArena Demo Cup") with completed
 * matches, full scorecards and player records. Real registered players
 * (Rohit SMPL-A001, Deepak SMPL-A002, Chandra SMPL-A003) appear in the
 * scorecards so their "My Performance" pages show live stats.
 */
const DEMO_ID = "T-DEMO";
const RS = "Royal Strikers";
const MW = "Metro Warriors";

const ROHIT = "SMPL-A001";
const DEEPAK = "SMPL-A002";
const CHANDRA = "SMPL-A003";
const ADMIN = "SMPL-ADMIN";

export async function ensureDemoData(): Promise<void> {
  const existing = await getTournament(DEMO_ID);
  // Reseed if missing or if it predates the admin-featured version.
  if (existing && existing.participants.some((p) => p.playerId === ADMIN)) {
    return;
  }
  if (existing) await deleteTournament(DEMO_ID);
  await insertTournament(buildDemoTournament());
}

function buildDemoTournament(): Tournament {
  return {
    id: DEMO_ID,
    name: "CricArena Demo Cup",
    venue: "Wankhede Maidan, Mumbai",
    description:
      "Sample tournament with completed matches, scorecards and player records. " +
      "Use it to explore stats — replace it with your own once live scoring is added.",
    entryFee: 0,
    matchDates: ["2026-08-10", "2026-08-17", "2026-08-24", "2026-09-14"],
    organizerId: ROHIT,
    organizerName: "Rohit Sharma",
    createdAt: "2026-08-01T09:00:00.000Z",
    participants: [
      { playerId: ROHIT, name: "Rohit Sharma", transactionId: "", joinedAt: "2026-08-01T09:05:00.000Z" },
      { playerId: DEEPAK, name: "Deepak", transactionId: "", joinedAt: "2026-08-01T09:06:00.000Z" },
      { playerId: CHANDRA, name: "Chandra", transactionId: "", joinedAt: "2026-08-01T09:07:00.000Z" },
      { playerId: ADMIN, name: "Administrator", transactionId: "", joinedAt: "2026-08-01T09:08:00.000Z" },
    ],
    matches: [match1(), match2(), match3(), match4()],
  };
}

function match1(): Match {
  return {
    id: "M-001",
    date: "2026-08-10",
    teamA: RS,
    teamB: MW,
    status: "completed",
    result: "Royal Strikers won by 7 runs",
    playerOfTheMatch: "Rohit Sharma",
    innings: [
      {
        team: RS,
        runs: 178,
        wickets: 6,
        overs: 20,
        batting: [
          { playerId: ROHIT, name: "Rohit Sharma", how: "c Iyer b Deepak", runs: 82, balls: 51, fours: 8, sixes: 3 },
          { playerId: CHANDRA, name: "Chandra", how: "run out (Deepak)", runs: 41, balls: 29, fours: 3, sixes: 1 },
          { playerId: ADMIN, name: "Administrator", how: "c Pant b Bumrah", runs: 27, balls: 19, fours: 3, sixes: 1 },
          { name: "Suresh", how: "b Chahal", runs: 20, balls: 15, fours: 2, sixes: 0 },
          { name: "Akash", how: "not out", runs: 12, balls: 8, fours: 0, sixes: 1 },
          { name: "Manish", how: "c Pant b Chahal", runs: 8, balls: 6, fours: 1, sixes: 0 },
          { name: "Nikhil", how: "b Deepak", runs: 5, balls: 4, fours: 0, sixes: 0 },
        ],
        bowling: [
          { playerId: DEEPAK, name: "Deepak", overs: 4, maidens: 0, runs: 31, wickets: 2 },
          { name: "Chahal", overs: 4, maidens: 0, runs: 28, wickets: 2 },
          { name: "Bumrah", overs: 4, maidens: 0, runs: 30, wickets: 0 },
          { name: "Shami", overs: 4, maidens: 0, runs: 39, wickets: 1 },
          { name: "Pandya", overs: 4, maidens: 0, runs: 40, wickets: 0 },
        ],
        fielding: [
          { name: "Iyer", catches: 1 },
          { name: "Pant", catches: 1 },
          { playerId: DEEPAK, name: "Deepak", runOuts: 1 },
        ],
      },
      {
        team: MW,
        runs: 171,
        wickets: 8,
        overs: 20,
        batting: [
          { playerId: DEEPAK, name: "Deepak", how: "c Chandra b Akash", runs: 55, balls: 38, fours: 5, sixes: 2 },
          { name: "Iyer", how: "b Rohit", runs: 40, balls: 30, fours: 4, sixes: 0 },
          { name: "Pant", how: "st Chandra b Ashwin", runs: 30, balls: 20, fours: 2, sixes: 1 },
          { name: "Pandya", how: "c & b Akash", runs: 18, balls: 12, fours: 1, sixes: 1 },
          { name: "Shami", how: "run out (Suresh)", runs: 8, balls: 6, fours: 1, sixes: 0 },
        ],
        bowling: [
          { name: "Akash", overs: 4, maidens: 0, runs: 30, wickets: 3 },
          { playerId: ROHIT, name: "Rohit Sharma", overs: 3, maidens: 0, runs: 24, wickets: 1 },
          { name: "Ashwin", overs: 4, maidens: 0, runs: 28, wickets: 1 },
          { name: "Suresh", overs: 4, maidens: 0, runs: 35, wickets: 1 },
          { name: "Manish", overs: 5, maidens: 0, runs: 42, wickets: 0 },
        ],
        fielding: [{ playerId: CHANDRA, name: "Chandra", catches: 1, stumpings: 1 }],
      },
    ],
  };
}

function match2(): Match {
  return {
    id: "M-002",
    date: "2026-08-17",
    teamA: MW,
    teamB: RS,
    status: "completed",
    result: "Royal Strikers won by 6 wickets",
    playerOfTheMatch: "Chandra",
    innings: [
      {
        team: MW,
        runs: 149,
        wickets: 9,
        overs: 20,
        batting: [
          { name: "Iyer", how: "c Rohit b Ashwin", runs: 34, balls: 28, fours: 3, sixes: 0 },
          { playerId: DEEPAK, name: "Deepak", how: "lbw b Akash", runs: 28, balls: 22, fours: 3, sixes: 0 },
          { name: "Pandya", how: "c Chandra b Akash", runs: 25, balls: 19, fours: 2, sixes: 1 },
          { name: "Pant", how: "run out (Chandra)", runs: 22, balls: 18, fours: 2, sixes: 0 },
          { name: "Bumrah", how: "not out", runs: 12, balls: 9, fours: 1, sixes: 0 },
        ],
        bowling: [
          { name: "Akash", overs: 4, maidens: 0, runs: 31, wickets: 3 },
          { playerId: ROHIT, name: "Rohit Sharma", overs: 4, maidens: 0, runs: 27, wickets: 1 },
          { name: "Ashwin", overs: 4, maidens: 0, runs: 30, wickets: 2 },
          { name: "Suresh", overs: 4, maidens: 0, runs: 31, wickets: 2 },
          { name: "Manish", overs: 4, maidens: 0, runs: 24, wickets: 0 },
        ],
        fielding: [
          { playerId: ROHIT, name: "Rohit Sharma", catches: 1 },
          { playerId: CHANDRA, name: "Chandra", catches: 1, runOuts: 1 },
          { playerId: ADMIN, name: "Administrator", catches: 1 },
        ],
      },
      {
        team: RS,
        runs: 150,
        wickets: 4,
        overs: 18.2,
        batting: [
          { playerId: CHANDRA, name: "Chandra", how: "not out", runs: 52, balls: 34, fours: 4, sixes: 2 },
          { playerId: ROHIT, name: "Rohit Sharma", how: "c & b Deepak", runs: 39, balls: 31, fours: 5, sixes: 0 },
          { playerId: ADMIN, name: "Administrator", how: "b Chahal", runs: 21, balls: 15, fours: 2, sixes: 1 },
          { name: "Suresh", how: "not out", runs: 30, balls: 24, fours: 3, sixes: 0 },
          { name: "Akash", how: "b Chahal", runs: 15, balls: 10, fours: 1, sixes: 1 },
          { name: "Manish", how: "lbw b Deepak", runs: 8, balls: 7, fours: 1, sixes: 0 },
        ],
        bowling: [
          { playerId: DEEPAK, name: "Deepak", overs: 4, maidens: 0, runs: 33, wickets: 2 },
          { name: "Chahal", overs: 4, maidens: 0, runs: 30, wickets: 1 },
          { name: "Bumrah", overs: 4, maidens: 0, runs: 25, wickets: 1 },
          { name: "Shami", overs: 3, maidens: 0, runs: 28, wickets: 0 },
          { name: "Pandya", overs: 3.2, maidens: 0, runs: 31, wickets: 0 },
        ],
        fielding: [{ name: "Pant", catches: 1 }],
      },
    ],
  };
}

function match3(): Match {
  return {
    id: "M-003",
    date: "2026-08-24",
    teamA: RS,
    teamB: MW,
    status: "completed",
    result: "Metro Warriors won by 5 wickets",
    playerOfTheMatch: "Deepak",
    innings: [
      {
        team: RS,
        runs: 132,
        wickets: 10,
        overs: 19.4,
        batting: [
          { playerId: CHANDRA, name: "Chandra", how: "b Bumrah", runs: 30, balls: 25, fours: 2, sixes: 0 },
          { name: "Suresh", how: "c & b Deepak", runs: 28, balls: 22, fours: 3, sixes: 0 },
          { playerId: ROHIT, name: "Rohit Sharma", how: "c Pant b Deepak", runs: 24, balls: 20, fours: 3, sixes: 0 },
          { playerId: ADMIN, name: "Administrator", how: "not out", runs: 22, balls: 17, fours: 2, sixes: 0 },
          { name: "Akash", how: "run out (Iyer)", runs: 18, balls: 15, fours: 1, sixes: 1 },
          { name: "Ashwin", how: "b Deepak", runs: 10, balls: 8, fours: 1, sixes: 0 },
          { name: "Manish", how: "not out", runs: 6, balls: 5, fours: 0, sixes: 0 },
        ],
        bowling: [
          { playerId: DEEPAK, name: "Deepak", overs: 4, maidens: 1, runs: 22, wickets: 3 },
          { name: "Bumrah", overs: 4, maidens: 0, runs: 24, wickets: 2 },
          { name: "Chahal", overs: 4, maidens: 0, runs: 28, wickets: 2 },
          { name: "Shami", overs: 3.4, maidens: 0, runs: 30, wickets: 2 },
          { name: "Pandya", overs: 4, maidens: 0, runs: 28, wickets: 0 },
        ],
        fielding: [{ name: "Pant", catches: 1 }],
      },
      {
        team: MW,
        runs: 133,
        wickets: 5,
        overs: 19.1,
        batting: [
          { playerId: DEEPAK, name: "Deepak", how: "not out", runs: 44, balls: 33, fours: 4, sixes: 1 },
          { name: "Iyer", how: "c Chandra b Akash", runs: 30, balls: 24, fours: 3, sixes: 0 },
          { name: "Pant", how: "b Rohit", runs: 22, balls: 16, fours: 2, sixes: 1 },
          { name: "Pandya", how: "c Chandra b Rohit", runs: 15, balls: 12, fours: 1, sixes: 0 },
          { name: "Bumrah", how: "not out", runs: 8, balls: 6, fours: 1, sixes: 0 },
        ],
        bowling: [
          { playerId: ROHIT, name: "Rohit Sharma", overs: 4, maidens: 0, runs: 29, wickets: 2 },
          { playerId: ADMIN, name: "Administrator", overs: 3, maidens: 1, runs: 18, wickets: 1 },
          { name: "Akash", overs: 4, maidens: 0, runs: 26, wickets: 1 },
          { name: "Ashwin", overs: 4, maidens: 0, runs: 30, wickets: 1 },
          { name: "Suresh", overs: 3.1, maidens: 0, runs: 25, wickets: 1 },
          { name: "Manish", overs: 4, maidens: 0, runs: 20, wickets: 0 },
        ],
        fielding: [{ playerId: CHANDRA, name: "Chandra", catches: 2 }],
      },
    ],
  };
}

function match4(): Match {
  return {
    id: "M-004",
    date: "2026-09-14",
    teamA: RS,
    teamB: MW,
    status: "scheduled",
    innings: [],
  };
}
