import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBadmintonTournament, canManageBadminton, addBadmintonEvent, registerBadmintonPlayer, createBadmintonPair, generateBadmintonDraw, assignBadmintonScorer } from "@/lib/badminton";
import { DEFAULT_BADMINTON_RULES } from "@/lib/badminton-scoring";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Context) { const { id } = await params; const tournament = await getBadmintonTournament(id); return tournament ? NextResponse.json({ tournament }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
export async function POST(request: Request, { params }: Context) {
  const { id } = await params; const user = await getSessionUser(); const tournament = await getBadmintonTournament(id);
  if (!user || !tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageBadminton(tournament, { id: user.id, isAdmin: user.role === "admin" })) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json() as { action?: string; eventId?: string; participantIds?: string[]; scorerId?: string; player?: { id: string; name: string; gender?: string; club?: string; ranking?: number }; pair?: { name: string; playerIds: string[] }; event?: { name: string; type: "mens-singles" | "womens-singles" | "mens-doubles" | "womens-doubles" | "mixed-doubles"; rules?: typeof DEFAULT_BADMINTON_RULES } };
  try {
    if (body.action === "event" && body.event) return NextResponse.json({ tournament: await addBadmintonEvent(id, { ...body.event, rules: body.event.rules ?? DEFAULT_BADMINTON_RULES }, user.id) });
    if (body.action === "player" && body.player) return NextResponse.json({ tournament: await registerBadmintonPlayer(id, body.player, user.id) });
    if (body.action === "pair" && body.pair) return NextResponse.json({ tournament: await createBadmintonPair(id, body.pair, user.id) });
    if (body.action === "draw" && body.eventId && body.participantIds) return NextResponse.json({ tournament: await generateBadmintonDraw(id, body.eventId, body.participantIds, user.id) });
    if (body.action === "scorer" && body.scorerId) return NextResponse.json({ tournament: await assignBadmintonScorer(id, body.scorerId, user.id) });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 422 }); }
}