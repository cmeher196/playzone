import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createLiveMatch } from "@/lib/live-matches";
import { getTeam, type Team } from "@/lib/teams";
import { matchCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

function toRef(team: Team) {
  return {
    teamId: team.id,
    name: team.name,
    players: team.players.map((p) => ({ playerId: p.playerId, name: p.name })),
  };
}

function selectedRef(team: Team, playerIds: string[]) {
  const selected = new Set(playerIds);
  return {
    ...toRef(team),
    players: team.players
      .filter((player) => selected.has(player.playerId))
      .map((p) => ({ playerId: p.playerId, name: p.name })),
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "guest") {
    return NextResponse.json({ error: "Create an account to organize a match." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = matchCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 422 },
    );
  }

  // Standalone matches still use real teams/players (picked via
  // MatchSetupWizard), just without a tournament attached — this keeps
  // every player's real registered id on the match so their performance,
  // stats, and rankings update correctly once it's completed.
  const teamA = await getTeam(parsed.data.teamAId);
  const teamB = await getTeam(parsed.data.teamBId);
  if (!teamA || !teamB) {
    return NextResponse.json({ error: "Both teams must exist." }, { status: 422 });
  }
  if (teamA.id === teamB.id) {
    return NextResponse.json({ error: "Pick two different teams." }, { status: 422 });
  }
  if (
    parsed.data.teamAPlayerIds.some(
      (playerId) => !teamA.players.some((player) => player.playerId === playerId),
    ) ||
    parsed.data.teamBPlayerIds.some(
      (playerId) => !teamB.players.some((player) => player.playerId === playerId),
    )
  ) {
    return NextResponse.json(
      { error: "Selected players must belong to their respective teams." },
      { status: 422 },
    );
  }
  if (
    parsed.data.tossWinnerId &&
    parsed.data.tossWinnerId !== teamA.id &&
    parsed.data.tossWinnerId !== teamB.id
  ) {
    return NextResponse.json(
      { error: "Toss winner must be one of the two teams." },
      { status: 422 },
    );
  }

  const match = await createLiveMatch({
    ownerId: user.id,
    teamA: selectedRef(teamA, parsed.data.teamAPlayerIds),
    teamB: selectedRef(teamB, parsed.data.teamBPlayerIds),
    overs: parsed.data.overs,
    venue: parsed.data.venue,
    date: parsed.data.date,
    tossWinnerTeamId: parsed.data.tossWinnerId,
    tossDecision: parsed.data.tossDecision,
  });
  return NextResponse.json({ match }, { status: 201 });
}
