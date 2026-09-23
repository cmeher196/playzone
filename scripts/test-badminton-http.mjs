// Authenticated end-to-end HTTP integration test for Phase 7-9.
// Requires the dev server running on http://localhost:3000.
// Mints valid session cookies using the dev-default AUTH secret, then drives
// the real API: create league -> add players -> create match -> assign scorer
// -> start -> score (with concurrency) -> undo -> permission checks -> cleanup.
//
// Run: node scripts/test-badminton-http.mjs

import crypto from "node:crypto";

const BASE = "http://localhost:3000";
const SECRET = "dev-insecure-auth-secret-change-me"; // matches auth.ts default
const TTL = 30 * 24 * 60 * 60 * 1000;

const OWNER = "SMPL-A002"; // Deepak (organizer)
const SCORER = "SMPL-A001"; // assigned scorer
const OUTSIDER = "SMPL-A003"; // neither owner nor scorer

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}
function sessionCookie(id) {
  const payload = `${id}.${Date.now() + TTL}`;
  const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
  return `cric_session=${token}`;
}

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

async function api(path, { method = "GET", body, as = OWNER } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: sessionCookie(as) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, data };
}

let tournamentId = null;

try {
  console.log("\n=== BADMINTON PHASE 7-9 HTTP INTEGRATION TEST ===\n");

  // 1. Create league
  console.log("STEP 1: Create league (as owner)");
  let r = await api("/api/badminton/tournaments", {
    method: "POST",
    body: { name: "E2E HTTP League", courtCount: 2 },
  });
  assert(r.status === 201, `Created league (HTTP ${r.status})`);
  tournamentId = r.data?.id;
  assert(!!tournamentId, `Got tournament id: ${tournamentId}`);
  const courtId = r.data?.courts?.[0]?.id;
  assert(!!courtId, `Got court id: ${courtId}`);

  // 2. Add participants
  console.log("\nSTEP 2: Add participants");
  r = await api(`/api/badminton/tournaments/${tournamentId}`, {
    method: "PATCH",
    body: { participantIds: [OWNER, SCORER, OUTSIDER] },
  });
  assert(r.status === 200, `Added participants (HTTP ${r.status})`);

  // 3. Create a singles match
  console.log("\nSTEP 3: Create singles match");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches`, {
    method: "POST",
    body: { courtId, format: "singles", playerA: OWNER, playerB: SCORER },
  });
  assert(r.status === 201, `Created match (HTTP ${r.status})`);
  const matchId = r.data?.id;
  assert(!!matchId, `Got match id: ${matchId}`);

  // 4. Assign scorer
  console.log("\nSTEP 4: Assign scorer");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/scorer`, {
    method: "PATCH",
    body: { scorerId: SCORER },
  });
  assert(r.status === 200, `Assigned scorer (HTTP ${r.status})`);
  assert(r.data?.assignedScorerId === SCORER, "Scorer id persisted on match");

  // 5. Permission: scorer cannot score before match is live
  console.log("\nSTEP 5: Scorer cannot score before match is live");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    as: SCORER,
    body: { action: "point", side: "playerA" },
  });
  assert(r.status === 422, `Scoring blocked pre-live (HTTP ${r.status})`);

  // 6. Owner starts the match
  console.log("\nSTEP 6: Start match (owner)");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}`, {
    method: "PATCH",
    body: { status: "live" },
  });
  assert(r.status === 200 && r.data?.status === "live", `Match is live (HTTP ${r.status})`);

  // 7. Permission: outsider cannot score
  console.log("\nSTEP 7: Outsider cannot score");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    as: OUTSIDER,
    body: { action: "point", side: "playerA" },
  });
  assert(r.status === 422, `Outsider blocked (HTTP ${r.status})`);

  // 8. Assigned scorer scores a point
  console.log("\nSTEP 8: Assigned scorer scores");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    as: SCORER,
    body: { action: "point", side: "playerA", expectedSequence: 0 },
  });
  assert(r.status === 200, `Scorer recorded point (HTTP ${r.status})`);
  assert(r.data?.match?.games?.[0]?.playerAScore === 1, "Score is 1-0");
  assert(r.data?.sequence === 1, "Sequence advanced to 1");

  // 9. Concurrency: stale sequence rejected
  console.log("\nSTEP 9: Stale sequence rejected (409)");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    as: SCORER,
    body: { action: "point", side: "playerB", expectedSequence: 0 }, // stale
  });
  assert(r.status === 409, `Conflict on stale sequence (HTTP ${r.status})`);

  // 10. Owner can also score (owner override)
  console.log("\nSTEP 10: Owner can score too");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    as: OWNER,
    body: { action: "point", side: "playerB" }, // no sequence = no concurrency check
  });
  assert(r.status === 200, `Owner recorded point (HTTP ${r.status})`);
  assert(r.data?.match?.games?.[0]?.playerBScore === 1, "Score is 1-1");

  // 11. Undo
  console.log("\nSTEP 11: Undo last point");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    as: SCORER,
    body: { action: "undo" },
  });
  assert(r.status === 200, `Undo accepted (HTTP ${r.status})`);
  assert(r.data?.match?.games?.[0]?.playerBScore === 0, "Undo reverted to 1-0");

  // 12. Play out game 1 to 21-1 for player A
  console.log("\nSTEP 12: Complete game 1 (drive to 21)");
  for (let i = 0; i < 20; i++) {
    r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
      method: "POST",
      as: SCORER,
      body: { action: "point", side: "playerA" },
    });
  }
  assert(r.status === 200, "Scored to game point");
  const g1 = r.data?.match?.games?.[0];
  assert(g1?.playerAScore === 21 && g1?.winner === "playerA", "Game 1 won 21-0 by A");
  assert(r.data?.match?.currentGameIndex === 1, "Advanced to game 2");

  // 13. Win game 2 → match complete
  console.log("\nSTEP 13: Win game 2 → match complete");
  for (let i = 0; i < 21; i++) {
    r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
      method: "POST",
      as: SCORER,
      body: { action: "point", side: "playerA" },
    });
  }
  assert(r.data?.match?.matchWinner === "playerA", "Match winner is A");
  assert(r.data?.match?.status === "completed", "Match status completed");

  // 14. Cannot score after completion
  console.log("\nSTEP 14: No scoring after completion");
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    as: SCORER,
    body: { action: "point", side: "playerA" },
  });
  assert(r.status === 422, `Scoring blocked after completion (HTTP ${r.status})`);

  // 15. Remove scorer, verify they lose access (restart a fresh match)
  console.log("\nSTEP 15: Remove scorer revokes access");
  // Create a second match on court 2
  const courtId2 = (await api(`/api/badminton/tournaments/${tournamentId}`)).data.courts[1].id;
  const m2 = await api(`/api/badminton/tournaments/${tournamentId}/matches`, {
    method: "POST",
    body: { courtId: courtId2, format: "singles", playerA: OWNER, playerB: OUTSIDER },
  });
  const matchId2 = m2.data.id;
  await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId2}/scorer`, {
    method: "PATCH",
    body: { scorerId: SCORER },
  });
  await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId2}`, {
    method: "PATCH",
    body: { status: "live" },
  });
  // Scorer can score now
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId2}/score`, {
    method: "POST",
    as: SCORER,
    body: { action: "point", side: "playerA" },
  });
  assert(r.status === 200, "Scorer can score match 2 while assigned");
  // Remove scorer
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId2}/scorer`, {
    method: "DELETE",
  });
  assert(r.status === 200, "Scorer removed");
  // Scorer can no longer score
  r = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId2}/score`, {
    method: "POST",
    as: SCORER,
    body: { action: "point", side: "playerA" },
  });
  assert(r.status === 422, `Removed scorer blocked (HTTP ${r.status})`);

  // 16. Knockout schedule: 4 players → 2 semis + 1 final = 3 matches
  console.log("\nSTEP 16: Knockout bracket (4 players → 3 matches)");
  const t2 = await api("/api/badminton/tournaments", {
    method: "POST",
    body: { name: "E2E Knockout League", courtCount: 2 },
  });
  const t2Id = t2.data.id;
  await api(`/api/badminton/tournaments/${t2Id}`, {
    method: "PATCH",
    body: { participantIds: [OWNER, SCORER, OUTSIDER, "SMPL-A004"] },
  });
  r = await api(`/api/badminton/tournaments/${t2Id}/schedule`, {
    method: "POST",
    body: { format: "singles" },
  });
  assert(r.status === 201, `Bracket generated (HTTP ${r.status})`);
  assert(r.data?.created === 3, `4 players → 3 matches (got ${r.data?.created})`);
  assert(r.data?.rounds === 2, `2 rounds (got ${r.data?.rounds})`);
  let t2full = await api(`/api/badminton/tournaments/${t2Id}`);
  const finals = t2full.data.matches.filter((m) => m.round === "Final");
  const semis = t2full.data.matches.filter((m) => m.round === "Semi Final");
  assert(semis.length === 2 && finals.length === 1, "2 semis + 1 final");
  assert(finals[0].playerA === "" && finals[0].playerB === "", "Final starts with TBD players");

  // 17. Re-clicking without reset does NOT duplicate (409)
  console.log("\nSTEP 17: Re-generate without reset is blocked (no duplicates)");
  r = await api(`/api/badminton/tournaments/${t2Id}/schedule`, {
    method: "POST",
    body: { format: "singles" },
  });
  assert(r.status === 409, `Duplicate generation blocked (HTTP ${r.status})`);
  t2full = await api(`/api/badminton/tournaments/${t2Id}`);
  assert(t2full.data.matches.length === 3, `Still 3 matches (got ${t2full.data.matches.length})`);

  // 18. Reset regenerates cleanly
  console.log("\nSTEP 18: Reset regenerates");
  r = await api(`/api/badminton/tournaments/${t2Id}/schedule`, {
    method: "POST",
    body: { format: "singles", reset: true },
  });
  assert(r.status === 201 && r.data?.created === 3, "Reset produced a fresh 3-match bracket");

  // 19. Winner of a semi advances into the final
  console.log("\nSTEP 19: Winner advances to final");
  t2full = await api(`/api/badminton/tournaments/${t2Id}`);
  const semi1 = t2full.data.matches.find((m) => m.round === "Semi Final");
  await api(`/api/badminton/tournaments/${t2Id}/matches/${semi1.id}/scorer`, {
    method: "PATCH",
    body: { scorerId: OWNER },
  });
  await api(`/api/badminton/tournaments/${t2Id}/matches/${semi1.id}`, {
    method: "PATCH",
    body: { status: "live" },
  });
  for (let i = 0; i < 42; i++) {
    r = await api(`/api/badminton/tournaments/${t2Id}/matches/${semi1.id}/score`, {
      method: "POST",
      body: { action: "point", side: "playerA" },
    });
    if (r.data?.match?.matchWinner) break;
  }
  assert(r.data?.match?.matchWinner === "playerA", "Semi 1 completed");
  const advancedId = semi1.playerA;
  t2full = await api(`/api/badminton/tournaments/${t2Id}`);
  const finalMatch = t2full.data.matches.find((m) => m.round === "Final");
  const finalHasWinner =
    finalMatch.playerA === advancedId || finalMatch.playerB === advancedId;
  assert(finalHasWinner, "Semi winner placed into the final");

  // 20. Edit a scheduled match (change court)
  console.log("\nSTEP 20: Edit a scheduled match");
  const semi2 = t2full.data.matches.find((m) => m.round === "Semi Final" && m.id !== semi1.id);
  const otherCourt = t2full.data.courts.find((c) => c.id !== semi2.courtId).id;
  r = await api(`/api/badminton/tournaments/${t2Id}/matches/${semi2.id}`, {
    method: "PATCH",
    body: { courtId: otherCourt },
  });
  assert(r.status === 200 && r.data?.courtId === otherCourt, "Match court edited");

  // 21. Cannot edit a completed match
  console.log("\nSTEP 21: Completed match is locked for edits");
  r = await api(`/api/badminton/tournaments/${t2Id}/matches/${semi1.id}`, {
    method: "PATCH",
    body: { courtId: otherCourt },
  });
  assert(r.status === 409, `Completed match edit blocked (HTTP ${r.status})`);

  // 22. Delete a match
  console.log("\nSTEP 22: Delete a match");
  r = await api(`/api/badminton/tournaments/${t2Id}/matches/${semi2.id}`, { method: "DELETE" });
  assert(r.status === 200, `Match deleted (HTTP ${r.status})`);
  t2full = await api(`/api/badminton/tournaments/${t2Id}`);
  assert(t2full.data.matches.length === 2, `2 matches remain (got ${t2full.data.matches.length})`);

  // 23. Standings reflect the completed semi
  console.log("\nSTEP 23: Points table populated");
  // computeBadmintonStandings isn't exposed via API; verify via the completed match data.
  const completed = t2full.data.matches.filter((m) => m.status === "completed" && !m.isBye);
  assert(completed.length >= 1, "At least one played result for standings");

  // 24. Public live scoreboard viewable by non-owner
  console.log("\nSTEP 24: Live scores viewable by any logged-in user");
  const liveRes = await fetch(`${BASE}/badminton/${t2Id}/live`, {
    headers: { Cookie: sessionCookie(OUTSIDER) },
    redirect: "manual",
  });
  assert(liveRes.status === 200, `Outsider can load live page (HTTP ${liveRes.status})`);

  // Cleanup second tournament
  await api(`/api/badminton/tournaments/${t2Id}`, { method: "DELETE" });

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
} catch (error) {
  console.error("Test error:", error);
  failed++;
} finally {
  // Cleanup: delete the test tournament
  if (tournamentId) {
    const r = await api(`/api/badminton/tournaments/${tournamentId}`, { method: "DELETE" });
    console.log(`Cleanup: deleted ${tournamentId} (HTTP ${r.status})`);
  }
}

process.exit(failed > 0 ? 1 : 0);
