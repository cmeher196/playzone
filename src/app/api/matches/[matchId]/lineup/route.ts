import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament } from "@/lib/tournaments";
import { getLiveMatch, setMatchLineup, canScoreLiveMatch } from "@/lib/live-matches";
import { computeMatch } from "@/lib/live-scoring";
import { matchLineupSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { matchId } = await params;
  const match = await getLiveMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const tournament = match.tournamentId ? await getTournament(match.tournamentId) : undefined;
  if (!canScoreLiveMatch(match, {
    id: user.id,
    isAdmin: isAdmin(user),
  }, tournament?.organizerId, tournament?.scorers)) {
    return NextResponse.json(
      { error: "Only the owner, organizer, an assigned scorer, or an admin can confirm the lineup." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = matchLineupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the playing XI and roles." },
      { status: 422 },
    );
  }

  const { teamId, playingXI, twelfthManId, captainId, viceCaptainId, wicketkeeperId } = parsed.data;
  const team =
    teamId === match.teamA.teamId ? match.teamA : teamId === match.teamB.teamId ? match.teamB : undefined;
  if (!team) {
    return NextResponse.json({ error: "That team isn't part of this match." }, { status: 422 });
  }

  const rosterIds = new Set(team.players.map((player) => player.playerId));
  const allChosenIds = [...playingXI, ...(twelfthManId ? [twelfthManId] : [])];
  if (allChosenIds.some((id) => !rosterIds.has(id))) {
    return NextResponse.json(
      { error: "Every player must belong to this team's roster." },
      { status: 422 },
    );
  }
  if (new Set(playingXI).size !== playingXI.length) {
    return NextResponse.json({ error: "Playing XI has duplicate players." }, { status: 422 });
  }

  const result = await setMatchLineup(matchId, teamId, {
    playingXI,
    twelfthManId,
    captainId,
    viceCaptainId,
    wicketkeeperId,
  });
  if (result === "not-found") {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  if (result === "invalid-team") {
    return NextResponse.json({ error: "That team isn't part of this match." }, { status: 422 });
  }
  if (result === "already-set") {
    return NextResponse.json({ error: "This team's lineup has already been confirmed." }, { status: 409 });
  }
  if (result === "already-started") {
    return NextResponse.json({ error: "The match has already started." }, { status: 409 });
  }
  return NextResponse.json({ match: result, live: computeMatch(result) });
}
