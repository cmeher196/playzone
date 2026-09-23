import { NextResponse } from "next/server";
import { getLiveMatch } from "@/lib/live-matches";
import { rescheduleLiveMatch } from "@/lib/live-matches";
import { computeMatch } from "@/lib/live-scoring";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { canManageTournament, getTournament } from "@/lib/tournaments";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const match = await getLiveMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  return NextResponse.json({ match, live: computeMatch(match) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { matchId } = await params;
  const match = await getLiveMatch(matchId);
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  const tournament = await getTournament(match.tournamentId);
  if (!canManageTournament(tournament ?? { organizerId: "" }, { id: user.id, isAdmin: isAdmin(user) })) {
    return NextResponse.json({ error: "Only the organizer or an admin can reschedule matches." }, { status: 403 });
  }
  let body: { date?: unknown; venue?: unknown };
  try { body = (await request.json()) as { date?: unknown; venue?: unknown }; } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "Choose a valid match date." }, { status: 422 });
  }
  const updated = await rescheduleLiveMatch(matchId, body.date, typeof body.venue === "string" ? body.venue.trim() : undefined);
  if (updated === "locked") return NextResponse.json({ error: "Only scheduled matches can be rescheduled." }, { status: 409 });
  return NextResponse.json({ match: updated });
}
