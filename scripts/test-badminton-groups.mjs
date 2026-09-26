// End-to-end HTTP test for the badminton GROUP STAGE feature.
// Requires the dev server running on http://localhost:3000.
// Mints a valid owner session cookie (dev AUTH secret), then drives the real API:
//   create league (with groups) -> create/add teams -> auto-distribute ->
//   generate group round-robin -> score group matches -> generate knockout from
//   winners -> score knockout -> verify team-label propagation + champion.
// Cleans up every created tournament/team at the end.
//
// Run: node scripts/test-badminton-groups.mjs

import crypto from "node:crypto";

const BASE = "http://localhost:3000";
const SECRET = "dev-insecure-auth-secret-change-me"; // matches auth.ts default
const TTL = 30 * 24 * 60 * 60 * 1000;
const OWNER = "SMPL-A002"; // organizer

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
    console.log(`  \u2713 ${msg}`);
  } else {
    failed++;
    console.error(`  \u2717 FAIL: ${msg}`);
  }
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: sessionCookie(OWNER) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function completeMatch(tournamentId, matchId, side = "playerA") {
  // Flip to live, then score the same side to 5 (pointsToWin=5, bestOf=1 => instant win).
  await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}`, {
    method: "PATCH",
    body: { status: "live" },
  });
  let last;
  for (let i = 0; i < 5; i++) {
    last = await api(`/api/badminton/tournaments/${tournamentId}/matches/${matchId}/score`, {
      method: "POST",
      body: { action: "point", side },
    });
  }
  return last;
}

async function main() {
  const createdTeams = [];
  let tournamentId;
  try {
    console.log("\n\u25b6 Create league with a group stage");
    const create = await api("/api/badminton/tournaments", {
      method: "POST",
      body: {
        name: `Group Test ${Date.now()}`,
        courtCount: 4,
        bestOf: 1,
        pointsToWin: 5,
        enableGroups: true,
        groupCount: 2,
        advanceCount: 2,
      },
    });
    assert(create.status === 201, `tournament created (status ${create.status})`);
    tournamentId = create.data?.id;
    assert(!!tournamentId, `tournament id assigned (${tournamentId})`);
    assert(create.data?.groupStage?.enabled === true, "groupStage enabled");
    assert(create.data?.groupStage?.groups?.length === 2, "2 groups created");
    assert(create.data?.groupStage?.advanceCount === 2, "advanceCount = 2");
    assert(
      (create.data?.groupStage?.groups ?? []).every((g) => g.teamIds.length === 0),
      "groups start empty",
    );

    console.log("\n\u25b6 Arbitrary group count at creation");
    const three = await api("/api/badminton/tournaments", {
      method: "POST",
      body: {
        name: `Grp3 ${Date.now()}`,
        courtCount: 2,
        bestOf: 1,
        pointsToWin: 5,
        enableGroups: true,
        groupCount: 3,
        advanceCount: 1,
      },
    });
    assert(
      three.status === 201 && three.data?.groupStage?.groups?.length === 3,
      "3-group league created (arbitrary count, not a preset)",
    );
    if (three.data?.id) await api(`/api/badminton/tournaments/${three.data.id}`, { method: "DELETE" });

    console.log("\n\u25b6 Add / remove groups dynamically + relabel");
    let edit = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: { action: "add-group" },
    });
    assert(edit.status === 200 && edit.data?.groupStage?.groups?.length === 3, "add-group \u2192 3 groups");
    const relabeled = edit.data.groupStage.groups.map((x) => x.name);
    assert(
      JSON.stringify(relabeled) === JSON.stringify(["Group A", "Group B", "Group C"]),
      "groups relabeled A/B/C",
    );
    const thirdId = edit.data.groupStage.groups[2].id;
    edit = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: { action: "remove-group", groupId: thirdId },
    });
    assert(edit.status === 200 && edit.data?.groupStage?.groups?.length === 2, "remove-group \u2192 back to 2 groups");

    console.log("\n\u25b6 Change advance-per-group live");
    edit = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: { action: "advance", advanceCount: 1 },
    });
    assert(edit.status === 200 && edit.data?.groupStage?.advanceCount === 1, "advance \u2192 1");
    edit = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: { action: "advance", advanceCount: 2 },
    });
    assert(edit.status === 200 && edit.data?.groupStage?.advanceCount === 2, "advance \u2192 2");

    console.log("\n\u25b6 Create 4 singles teams and add them");
    for (let i = 1; i <= 4; i++) {
      const t = await api("/api/badminton/teams", {
        method: "POST",
        body: { name: `GT Team ${i}-${Date.now()}`, playerIds: [`GTP-${i}-${Date.now()}`] },
      });
      assert(t.status === 201, `team ${i} created (status ${t.status})`);
      createdTeams.push(t.data.id);
      const add = await api(`/api/badminton/tournaments/${tournamentId}/teams`, {
        method: "POST",
        body: { teamId: t.data.id },
      });
      assert(add.status === 200 || add.status === 201, `team ${i} added to tournament`);
    }

    console.log("\n\u25b6 Auto-distribute teams into groups");
    const dist = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: { action: "distribute", shuffle: false },
    });
    assert(dist.status === 200, `distribute ok (status ${dist.status})`);
    const groupsAfter = dist.data?.groupStage?.groups ?? [];
    assert(
      groupsAfter.length === 2 && groupsAfter.every((g) => g.teamIds.length === 2),
      "each group has 2 teams",
    );
    const placed = groupsAfter.flatMap((g) => g.teamIds);
    assert(new Set(placed).size === 4, "all 4 teams placed uniquely");

    console.log("\n\u25b6 Manual re-assignment between groups");
    const gA = groupsAfter[0];
    const gB = groupsAfter[1];
    const moved = gA.teamIds[0];
    let asg = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: {
        action: "assign",
        groups: [
          { id: gA.id, teamIds: gA.teamIds.filter((t) => t !== moved) },
          { id: gB.id, teamIds: [...gB.teamIds, moved] },
        ],
      },
    });
    assert(asg.status === 200, "manual assign accepted");
    const movedInto = asg.data.groupStage.groups.find((x) => x.id === gB.id);
    assert(movedInto.teamIds.includes(moved) && movedInto.teamIds.length === 3, "team moved into group B");
    // Even the groups back to 2/2 for the downstream knockout flow.
    asg = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: { action: "distribute", shuffle: false },
    });
    assert(asg.status === 200, "re-distributed evenly");

    console.log("\n\u25b6 Generate group round-robin matches");
    const gen = await api(`/api/badminton/tournaments/${tournamentId}/groups/schedule`, {
      method: "POST",
      body: { stage: "group" },
    });
    assert(gen.status === 201, `group matches generated (status ${gen.status})`);
    assert(gen.data?.created === 2, `2 group matches created (got ${gen.data?.created})`);

    let snap = await api(`/api/badminton/tournaments/${tournamentId}`);
    const groupMatches = (snap.data?.matches ?? []).filter((m) => m.groupId);
    assert(groupMatches.length === 2, "2 matches carry a groupId");
    assert(
      groupMatches.every((m) => m.teamAId && m.teamBId && m.teamAName && m.teamBName),
      "group matches carry team identity",
    );

    console.log("\n\u25b6 Knockout blocked until group stage completes");
    const early = await api(`/api/badminton/tournaments/${tournamentId}/groups/schedule`, {
      method: "POST",
      body: { stage: "knockout" },
    });
    assert(early.status === 400 && early.data?.code === "group-stage-incomplete", "knockout blocked (incomplete)");

    console.log("\n\u25b6 Complete the group matches");
    for (const m of groupMatches) {
      const r = await completeMatch(tournamentId, m.id);
      assert(r.status === 200 && r.data?.match?.matchWinner === "playerA", `group match ${m.id} completed`);
    }

    console.log("\n\u25b6 Generate knockout from group winners");
    const ko = await api(`/api/badminton/tournaments/${tournamentId}/groups/schedule`, {
      method: "POST",
      body: { stage: "knockout" },
    });
    assert(ko.status === 201, `knockout generated (status ${ko.status})`);
    assert(ko.data?.rounds === 2, `2 knockout rounds for 4 qualifiers (got ${ko.data?.rounds})`);
    assert(ko.data?.created === 3, `3 knockout matches (2 semis + final) (got ${ko.data?.created})`);

    snap = await api(`/api/badminton/tournaments/${tournamentId}`);
    const koMatches = (snap.data?.matches ?? []).filter((m) => m.round && !m.groupId);
    assert(koMatches.length === 3, "3 knockout matches present");
    const semis = koMatches.filter((m) => m.round === "Semi Final");
    const finals = koMatches.filter((m) => m.round === "Final");
    assert(semis.length === 2, "2 semi finals");
    assert(finals.length === 1, "1 final");
    assert(
      semis.every((m) => m.teamAId && m.teamBId),
      "both semis seeded with two teams",
    );
    // No first-round rematch of teams from the same group.
    const groupOf = new Map();
    for (const g of snap.data.groupStage.groups) for (const id of g.teamIds) groupOf.set(id, g.id);
    assert(
      semis.every((m) => groupOf.get(m.teamAId) !== groupOf.get(m.teamBId)),
      "semis avoid same-group first-round clashes",
    );

    console.log("\n\u25b6 Play out the knockout and verify propagation + champion");
    for (const m of semis) {
      const r = await completeMatch(tournamentId, m.id);
      assert(r.status === 200, `semi ${m.id} completed`);
    }
    snap = await api(`/api/badminton/tournaments/${tournamentId}`);
    const finalMatch = snap.data.matches.find((m) => m.round === "Final" && !m.groupId);
    assert(
      finalMatch.teamAId && finalMatch.teamBId && finalMatch.teamAName && finalMatch.teamBName,
      "final inherited both semi winners with team labels (team propagation works)",
    );
    const r = await completeMatch(tournamentId, finalMatch.id);
    assert(r.status === 200 && r.data?.match?.matchWinner, "final completed with a winner");

    console.log("\n\u25b6 Reshaping groups is locked once matches exist");
    const lock = await api(`/api/badminton/tournaments/${tournamentId}/groups`, {
      method: "PATCH",
      body: { action: "distribute", shuffle: true },
    });
    assert(lock.status === 409, `group reshuffle locked after matches exist (status ${lock.status})`);
  } finally {
    console.log("\n\u25b6 Cleanup");
    if (tournamentId) {
      const del = await api(`/api/badminton/tournaments/${tournamentId}`, { method: "DELETE" });
      assert(del.status === 200, "tournament deleted");
    }
    for (const teamId of createdTeams) {
      await api(`/api/badminton/teams/${teamId}`, { method: "DELETE" });
    }
    console.log(`  cleaned up ${createdTeams.length} teams`);
  }

  console.log(`\n${failed === 0 ? "\u2705 PASS" : "\u274c FAIL"} \u2014 ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
