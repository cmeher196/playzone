import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTeam, updateTeam, deleteTeam, canManageTeamForUser } from "@/lib/teams";
import { teamUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
  return NextResponse.json({ team });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  if (!(await canManageTeamForUser(team, { id: user.id, isAdmin: isAdmin(user) }))) {
    return NextResponse.json(
      { error: "You can't manage this team." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = teamUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 422 },
    );
  }

  const patch = parsed.data;
  if (patch.captainId && !team.players.some((p) => p.playerId === patch.captainId)) {
    return NextResponse.json(
      { error: "Captain must be a player in the team." },
      { status: 422 },
    );
  }
  if (
    patch.viceCaptainId &&
    !team.players.some((p) => p.playerId === patch.viceCaptainId)
  ) {
    return NextResponse.json(
      { error: "Vice-captain must be a player in the team." },
      { status: 422 },
    );
  }

  const updated = await updateTeam(teamId, patch);
  return NextResponse.json({ team: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  if (!(await canManageTeamForUser(team, { id: user.id, isAdmin: isAdmin(user) }))) {
    return NextResponse.json(
      { error: "You can't manage this team." },
      { status: 403 },
    );
  }

  await deleteTeam(teamId);
  return NextResponse.json({ ok: true });
}
