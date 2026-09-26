import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTournament } from "@/lib/tournaments";
import { getTeam, type Team } from "@/lib/teams";
import {
  createLiveMatch,
  listLiveMatchesForTournament,
} from "@/lib/live-matches";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const matches = await listLiveMatchesForTournament(id);
  return NextResponse.json({ matches });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if (user.role === "guest") {
    return NextResponse.json(
      { error: "Create an account to organize a match." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found." },
      { status: 404 },
    );
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

  const teamA = await getTeam(parsed.data.teamAId);
  const teamB = await getTeam(parsed.data.teamBId);
  if (
    !teamA ||
    !teamB ||
    teamA.tournamentId !== id ||
    teamB.tournamentId !== id
  ) {
    return NextResponse.json(
      { error: "Both teams must belong to this tournament." },
      { status: 422 },
    );
  }
  if (teamA.players.length === 0 || teamB.players.length === 0) {
    return NextResponse.json(
      { error: "Both teams need at least one player." },
      { status: 422 },
    );
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
    tournamentId: id,
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
