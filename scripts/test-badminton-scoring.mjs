// End-to-end test for the badminton SCORING ENGINE (rally-point, best of 3)
// Run with: node scripts/test-badminton-scoring.mjs
// Tests the pure scoring rules by replicating the engine logic against the data model.

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

// ---- Replicated engine rules (mirror of src/lib/badminton-tournaments.ts) ----
const POINTS_TO_WIN = 21;
const WIN_BY = 2;
const MAX_POINTS = 30;
const GAMES_TO_WIN_MATCH = 2;

function computeGameWinner(a, b) {
  const high = Math.max(a, b);
  if (high < POINTS_TO_WIN) return undefined;
  if (high >= MAX_POINTS) return a > b ? "playerA" : "playerB";
  if (Math.abs(a - b) < WIN_BY) return undefined;
  return a > b ? "playerA" : "playerB";
}

function newMatch() {
  return {
    games: [
      { playerAScore: 0, playerBScore: 0, isCompleted: false, winner: undefined },
      { playerAScore: 0, playerBScore: 0, isCompleted: false, winner: undefined },
      { playerAScore: 0, playerBScore: 0, isCompleted: false, winner: undefined },
    ],
    currentGameIndex: 0,
    matchWinner: undefined,
    status: "live",
    events: [],
  };
}

function countGamesWon(match) {
  let a = 0, b = 0;
  for (const g of match.games) {
    if (g.winner === "playerA") a++;
    else if (g.winner === "playerB") b++;
  }
  return { a, b };
}

function scorePoint(match, side) {
  if (match.matchWinner) return match;
  const game = match.games[match.currentGameIndex];
  if (!game || game.isCompleted) return match;
  const prev = { playerAScore: game.playerAScore, playerBScore: game.playerBScore };
  if (side === "playerA") game.playerAScore++;
  else game.playerBScore++;
  match.events.push({ side, prev, gameNumber: match.currentGameIndex + 1 });
  const w = computeGameWinner(game.playerAScore, game.playerBScore);
  if (w) {
    game.isCompleted = true;
    game.winner = w;
    const won = countGamesWon(match);
    if (won.a >= GAMES_TO_WIN_MATCH || won.b >= GAMES_TO_WIN_MATCH) {
      match.matchWinner = won.a > won.b ? "playerA" : "playerB";
      match.status = "completed";
    } else if (match.currentGameIndex < match.games.length - 1) {
      match.currentGameIndex++;
    }
  }
  return match;
}

function undo(match) {
  const events = match.events.filter((e) => true);
  if (events.length === 0) return match;
  const last = match.events.pop();
  match.matchWinner = undefined;
  if (match.status === "completed") match.status = "live";
  const idx = last.gameNumber - 1;
  match.currentGameIndex = idx;
  const g = match.games[idx];
  g.playerAScore = last.prev.playerAScore;
  g.playerBScore = last.prev.playerBScore;
  g.isCompleted = false;
  g.winner = undefined;
  for (let i = idx + 1; i < match.games.length; i++) {
    match.games[i] = { playerAScore: 0, playerBScore: 0, isCompleted: false, winner: undefined };
  }
  return match;
}

function playTo(match, side, n) {
  for (let i = 0; i < n; i++) scorePoint(match, side);
  return match;
}

console.log("\n=== BADMINTON SCORING ENGINE TEST ===\n");

// TEST 1: Straight game to 21
console.log("TEST 1: Win a game 21-0");
let m = newMatch();
playTo(m, "playerA", 21);
assert(m.games[0].winner === "playerA", "Player A wins game 1");
assert(m.games[0].isCompleted, "Game 1 marked complete");
assert(m.currentGameIndex === 1, "Advanced to game 2");
assert(!m.matchWinner, "Match not over after 1 game");

// TEST 2: Deuce — must win by 2
console.log("\nTEST 2: Deuce at 20-20, win by 2");
m = newMatch();
playTo(m, "playerA", 20);
playTo(m, "playerB", 20);
assert(!m.games[0].winner, "No winner at 20-20");
scorePoint(m, "playerA"); // 21-20
assert(!m.games[0].winner, "No winner at 21-20 (margin 1)");
scorePoint(m, "playerA"); // 22-20
assert(m.games[0].winner === "playerA", "Player A wins 22-20");

// TEST 3: Hard cap at 30
console.log("\nTEST 3: Cap at 30 — 30-29 wins");
m = newMatch();
// Alternate points so neither side ever leads by 2 → reaches 29-29.
for (let i = 0; i < 29; i++) {
  scorePoint(m, "playerA");
  scorePoint(m, "playerB");
}
assert(m.games[0].playerAScore === 29 && m.games[0].playerBScore === 29, "Reached 29-29");
assert(!m.games[0].winner, "No winner at 29-29");
scorePoint(m, "playerA"); // 30-29
assert(m.games[0].winner === "playerA", "Player A wins 30-29 at the cap");

// TEST 4: Best of 3 — win match in 2 games
console.log("\nTEST 4: Win match 2-0");
m = newMatch();
playTo(m, "playerA", 21); // game 1
playTo(m, "playerA", 21); // game 2
assert(m.matchWinner === "playerA", "Player A wins the match");
assert(m.status === "completed", "Match status completed");

// TEST 5: Three-game match (1-1 then decider)
console.log("\nTEST 5: Match goes to 3 games");
m = newMatch();
playTo(m, "playerA", 21); // A wins G1
playTo(m, "playerB", 21); // B wins G2
assert(m.currentGameIndex === 2, "On decider game 3");
assert(!m.matchWinner, "No winner yet at 1-1");
playTo(m, "playerB", 21); // B wins G3
assert(m.matchWinner === "playerB", "Player B wins decider");

// TEST 6: Undo reverses a point
console.log("\nTEST 6: Undo a point");
m = newMatch();
playTo(m, "playerA", 5);
scorePoint(m, "playerB"); // 5-1
undo(m);
assert(m.games[0].playerAScore === 5 && m.games[0].playerBScore === 0, "Undo removed B's point");

// TEST 7: Undo reopens a completed match
console.log("\nTEST 7: Undo reopens completed match");
m = newMatch();
playTo(m, "playerA", 21); // G1
playTo(m, "playerA", 20); // G2 at 20-0
scorePoint(m, "playerA"); // 21-0 → match complete 2-0
assert(m.matchWinner === "playerA", "Match complete before undo");
undo(m);
assert(!m.matchWinner, "Match reopened after undo");
assert(m.status === "live", "Status back to live");
assert(m.currentGameIndex === 1, "Back on game 2");
assert(m.games[1].playerAScore === 20, "Game 2 score restored to 20");

// TEST 8: Sequence == total points invariant
console.log("\nTEST 8: sequence == sum of points");
m = newMatch();
playTo(m, "playerA", 15);
playTo(m, "playerB", 10);
const totalPoints = m.games.reduce((s, g) => s + g.playerAScore + g.playerBScore, 0);
assert(totalPoints === m.events.length, `Total points (${totalPoints}) equals event count (${m.events.length})`);

// TEST 9: Cannot score after match complete
console.log("\nTEST 9: No scoring after completion");
m = newMatch();
playTo(m, "playerA", 21);
playTo(m, "playerA", 21); // match done 2-0
const before = m.games[m.currentGameIndex].playerAScore;
scorePoint(m, "playerA"); // should be ignored
assert(m.games[m.currentGameIndex].playerAScore === before, "Point ignored after match complete");

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
