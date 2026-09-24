import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  getTournament,
  canManageTournament,
  addTournamentScorer,
  removeTournamentScorer,
} from "@/lib/tournaments";
import { findByMobile } from "@/lib/registrations";
import { addScorerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });

  if (!canManageTournament(tournament, { id: user.id, isAdmin: isAdmin(user) })) {
    return NextResponse.json({ error: "Only the organizer or an admin can add scorers." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = addScorerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid mobile number." },
      { status: 422 },
    );
  }

  const player = await findByMobile(parsed.data.mobile);
  if (!player) {
    return NextResponse.json({ error: "No registered player with that mobile number." }, { status: 404 });
  }

  const result = await addTournamentScorer(id, { userId: player.id, name: player.name, mobile: player.mobile });
  if (result === "not-found") return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  if (result === "already-scorer") return NextResponse.json({ error: "This player is already a scorer." }, { status: 409 });
  return NextResponse.json({ tournament: result }, { status: 201 });
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
    return NextResponse.json({ error: "Only the organizer or an admin can remove scorers." }, { status: 403 });
  }

  let body: { userId?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.userId !== "string" || !body.userId) {
    return NextResponse.json({ error: "Choose a scorer to remove." }, { status: 422 });
  }

  const result = await removeTournamentScorer(id, body.userId);
  if (result === "not-found") return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  return NextResponse.json({ tournament: result });
}
