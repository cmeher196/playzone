import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { canManageTournament, getTournament } from "@/lib/tournaments";
import { listTeamsForTournament, createTeam, addTeamToTournament } from "@/lib/teams";
import { teamCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const teams = await listTeamsForTournament(id);
  return NextResponse.json({ teams });
}

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = teamCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 422 },
    );
  }

  if (parsed.data.sourceTeamId) {
    if (!canManageTournament(tournament, { id: user.id, isAdmin: isAdmin(user) })) {
      return NextResponse.json({ error: "Only the organizer or an admin can add an existing team." }, { status: 403 });
    }
    const added = await addTeamToTournament(parsed.data.sourceTeamId, id);
    if (added === "not-found") return NextResponse.json({ error: "Team not found." }, { status: 404 });
    if (added === "already-added") return NextResponse.json({ error: "This team is already in the tournament." }, { status: 409 });
    return NextResponse.json({ team: added }, { status: 201 });
  }

  const team = await createTeam({
    tournamentId: id,
    name: parsed.data.name,
    logo: parsed.data.logo,
    ownerId: user.id,
    ownerName: user.name,
  });
  return NextResponse.json({ team }, { status: 201 });
}
