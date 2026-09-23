import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament } from "@/lib/tournaments";
import { getTeam, removePlayerFromTeam, canManageTeamForUser } from "@/lib/teams";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; playerId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { teamId, playerId } = await params;
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

  const result = await removePlayerFromTeam(teamId, playerId);
  if (result === "not-found") {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
  return NextResponse.json({ team: result });
}
