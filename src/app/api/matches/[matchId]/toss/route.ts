import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament } from "@/lib/tournaments";
import { getLiveMatch, setMatchToss, canScoreLiveMatch } from "@/lib/live-matches";
import { computeMatch } from "@/lib/live-scoring";
import { matchTossSchema } from "@/lib/validation";

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
      { error: "Only the owner, organizer, an assigned scorer, or an admin can set the toss." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = matchTossSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Choose the toss winner and decision." },
      { status: 422 },
    );
  }

  if (
    parsed.data.tossWinnerId !== match.teamA.teamId &&
    parsed.data.tossWinnerId !== match.teamB.teamId
  ) {
    return NextResponse.json(
      { error: "Toss winner must be one of the two teams." },
      { status: 422 },
    );
  }

  const result = await setMatchToss(matchId, parsed.data.tossWinnerId, parsed.data.tossDecision);
  if (result === "not-found") {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  if (result === "already-set") {
    return NextResponse.json({ error: "The toss has already been decided for this match." }, { status: 409 });
  }
  if (result === "already-started") {
    return NextResponse.json({ error: "The match has already started." }, { status: 409 });
  }
  return NextResponse.json({ match: result, live: computeMatch(result) });
}
