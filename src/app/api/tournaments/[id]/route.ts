import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { tournamentUpdateSchema } from "@/lib/validation";
import {
  getTournament,
  updateTournament,
  deleteTournament,
  canManageTournament,
} from "@/lib/tournaments";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ tournament });
}

export async function PATCH(
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
      { error: "Only the organizer or an admin can edit this tournament." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = tournamentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 422 },
    );
  }

  const updated = await updateTournament(id, parsed.data);
  return NextResponse.json({ tournament: updated });
}

export async function DELETE(
  _request: Request,
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
      { error: "Only the organizer or an admin can delete this tournament." },
      { status: 403 },
    );
  }

  await deleteTournament(id);
  return NextResponse.json({ ok: true });
}
