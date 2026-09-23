import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament } from "@/lib/tournaments";
import { getLiveMatch, undoLast } from "@/lib/live-matches";
import { canManageLiveMatch } from "@/lib/live-matches";
import { computeMatch } from "@/lib/live-scoring";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
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
  if (!canManageLiveMatch(match, {
    id: user.id,
    isAdmin: isAdmin(user),
  }, tournament?.organizerId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const updated = await undoLast(matchId);
  if (!updated) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  return NextResponse.json({ match: updated, live: computeMatch(updated) });
}
