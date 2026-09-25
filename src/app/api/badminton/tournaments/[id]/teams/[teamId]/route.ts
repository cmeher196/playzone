import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTournament,
  removeTeamFromBadmintonTournament,
  canManageBadmintonTournament,
} from "@/lib/badminton-tournaments";

type Context = { params: Promise<{ id: string; teamId: string }> };

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, teamId } = await params;
    const tournament = await getBadmintonTournament(id);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (!canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await removeTeamFromBadmintonTournament(id, teamId);
    if (typeof result === "string") {
      return NextResponse.json({ error: result }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing team from tournament:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
