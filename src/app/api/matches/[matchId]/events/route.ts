import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament, canManageTournament } from "@/lib/tournaments";
import { getLiveMatch, applyEvent } from "@/lib/live-matches";
import { computeMatch } from "@/lib/live-scoring";
import { scoreEventSchema } from "@/lib/validation";

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

  const tournament = await getTournament(match.tournamentId);
  if (!canManageTournament(tournament ?? { organizerId: "" }, {
    id: user.id,
    isAdmin: isAdmin(user),
  })) {
    return NextResponse.json(
      { error: "Only the match scorer (organizer/admin) can score." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = scoreEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid delivery." },
      { status: 422 },
    );
  }

  const updated = await applyEvent(matchId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  return NextResponse.json({ match: updated, live: computeMatch(updated) });
}
