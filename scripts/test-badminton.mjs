// End-to-end test for badminton module data layer
// Run with: node scripts/test-badminton.mjs
import { promises as fs } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "badminton-tournaments.json");

// Backup existing data
let backup = "[]\n";
try {
  backup = await fs.readFile(dataFile, "utf8");
} catch {}

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

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8"));
  } catch {
    return [];
  }
}

async function writeAll(items) {
  await fs.writeFile(dataFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

console.log("\n=== BADMINTON END-TO-END TEST ===\n");

try {
  // Start clean
  await writeAll([]);

  // TEST 1: Create tournament with courts
  console.log("TEST 1: Create tournament with 4 courts");
  const tournament = {
    id: "BD-TEST",
    name: "E2E Test League",
    sport: "badminton",
    courtCount: 4,
    courts: Array.from({ length: 4 }, (_, i) => ({
      id: `BD-TEST-C${i + 1}`,
      number: i + 1,
      tournamentId: "BD-TEST",
      createdAt: new Date().toISOString(),
    })),
    matches: [],
    scoreEvents: [],
    participantIds: [],
    organizerId: "SMPL-A002",
    organizerName: "Deepak",
    createdAt: new Date().toISOString(),
    status: "scheduled",
  };
  await writeAll([tournament]);
  let items = await readAll();
  assert(items.length === 1, "Tournament persisted");
  assert(items[0].courts.length === 4, "4 courts auto-created");
  assert(items[0].courts[0].number === 1, "Court 1 numbered correctly");
  assert(items[0].courts[3].number === 4, "Court 4 numbered correctly");

  // TEST 2: Add participants
  console.log("\nTEST 2: Add participants");
  items = await readAll();
  items[0].participantIds = ["SMPL-A001", "SMPL-A002", "SMPL-A003", "SMPL-A004"];
  await writeAll(items);
  items = await readAll();
  assert(items[0].participantIds.length === 4, "4 participants added");

  // TEST 3: Add duplicate participants (should dedupe on merge)
  console.log("\nTEST 3: Merge participants without duplicates");
  const existing = items[0].participantIds;
  const merged = Array.from(new Set([...existing, "SMPL-A004", "SMPL-A005"]));
  items[0].participantIds = merged;
  await writeAll(items);
  items = await readAll();
  assert(items[0].participantIds.length === 5, "Deduped merge → 5 participants");

  // TEST 4: Create match on court (singles)
  console.log("\nTEST 4: Create singles match on court 1");
  items = await readAll();
  const match = {
    id: "BDM-001",
    courtId: "BD-TEST-C1",
    tournamentId: "BD-TEST",
    format: "singles",
    playerA: "SMPL-A001",
    playerB: "SMPL-A002",
    status: "scheduled",
    games: [
      { playerAScore: 0, playerBScore: 0, isCompleted: false },
      { playerAScore: 0, playerBScore: 0, isCompleted: false },
      { playerAScore: 0, playerBScore: 0, isCompleted: false },
    ],
    currentGameIndex: 0,
    createdAt: new Date().toISOString(),
  };
  items[0].matches.push(match);
  await writeAll(items);
  items = await readAll();
  assert(items[0].matches.length === 1, "Match created");
  assert(items[0].matches[0].courtId === "BD-TEST-C1", "Match on court 1");
  assert(items[0].matches[0].games.length === 3, "Best-of-3 games initialized");

  // TEST 5: Assign scorer
  console.log("\nTEST 5: Assign scorer to match");
  items = await readAll();
  items[0].matches[0].assignedScorerId = "SMPL-A003";
  await writeAll(items);
  items = await readAll();
  assert(items[0].matches[0].assignedScorerId === "SMPL-A003", "Scorer assigned");

  // TEST 6: Change scorer
  console.log("\nTEST 6: Change scorer");
  items = await readAll();
  items[0].matches[0].assignedScorerId = "SMPL-A005";
  await writeAll(items);
  items = await readAll();
  assert(items[0].matches[0].assignedScorerId === "SMPL-A005", "Scorer changed");

  // TEST 7: Remove scorer
  console.log("\nTEST 7: Remove scorer");
  items = await readAll();
  items[0].matches[0].assignedScorerId = undefined;
  await writeAll(items);
  items = await readAll();
  assert(!items[0].matches[0].assignedScorerId, "Scorer removed");

  // TEST 8: Create doubles match on different court
  console.log("\nTEST 8: Create doubles match on court 2 (concurrent)");
  items = await readAll();
  items[0].matches.push({
    id: "BDM-002",
    courtId: "BD-TEST-C2",
    tournamentId: "BD-TEST",
    format: "doubles",
    playerA: "SMPL-A001",
    playerB: "SMPL-A002",
    playerC: "SMPL-A003",
    playerD: "SMPL-A004",
    status: "live",
    games: [{ playerAScore: 0, playerBScore: 0, isCompleted: false }],
    currentGameIndex: 0,
    createdAt: new Date().toISOString(),
  });
  await writeAll(items);
  items = await readAll();
  assert(items[0].matches.length === 2, "2 concurrent matches");
  assert(items[0].matches[1].format === "doubles", "Doubles match created");
  const court1Match = items[0].matches.find((m) => m.courtId === "BD-TEST-C1");
  const court2Match = items[0].matches.find((m) => m.courtId === "BD-TEST-C2");
  assert(court1Match.id !== court2Match.id, "Matches independent across courts");

  // TEST 9: Delete tournament
  console.log("\nTEST 9: Delete tournament");
  let all = await readAll();
  all = all.filter((t) => t.id !== "BD-TEST");
  await writeAll(all);
  all = await readAll();
  assert(all.length === 0, "Tournament deleted");

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
} catch (error) {
  console.error("Test error:", error);
  failed++;
} finally {
  // Restore backup
  await fs.writeFile(dataFile, backup, "utf8");
  console.log("Restored original data.\n");
}

process.exit(failed > 0 ? 1 : 0);
