import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  getTournament,
  canManageTournament,
  addParticipants,
} from "@/lib/tournaments";
import { listPlayers } from "@/lib/registrations";
import { addParticipantsSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found." },
      { status: 404 },
    );
  }
  if (!canManageTournament(tournament, { id: user.id, isAdmin: isAdmin(user) })) {
    return NextResponse.json(
      { error: "Only the organizer or an admin can add players." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = addParticipantsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Select players to add." },
      { status: 422 },
    );
  }

  const byId = new Map((await listPlayers()).map((p) => [p.id, p]));
  const players = parsed.data.playerIds
    .map((pid) => byId.get(pid))
    .filter((p) => p !== undefined)
    .map((p) => ({ playerId: p.id, name: p.name }));

  if (players.length === 0) {
    return NextResponse.json(
      { error: "None of the selected players were found." },
      { status: 422 },
    );
  }

  const result = await addParticipants(id, players);
  if (result === "not-found") {
    return NextResponse.json(
      { error: "Tournament not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ tournament: result, added: players.length });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  if (!canManageTournament(tournament, { id: user.id, isAdmin: isAdmin(user) })) {
    return NextResponse.json({ error: "Only the organizer or an admin can remove players." }, { status: 403 });
  }
  let body: { playerId?: unknown };
  try { body = (await request.json()) as { playerId?: unknown }; } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.playerId !== "string" || !body.playerId) {
    return NextResponse.json({ error: "Choose a player to remove." }, { status: 422 });
  }
  const { removeParticipant } = await import("@/lib/tournaments");
  const result = await removeParticipant(id, body.playerId);
  if (result === "not-participant") return NextResponse.json({ error: "Player is not in this tournament." }, { status: 404 });
  return NextResponse.json({ tournament: result });
}
