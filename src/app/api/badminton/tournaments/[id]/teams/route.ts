import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTournament,
  addTeamToBadmintonTournament,
  canManageBadmintonTournament,
} from "@/lib/badminton-tournaments";
import { getBadmintonTeams } from "@/lib/badminton-teams";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tournament = await getBadmintonTournament(id);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const teams = await getBadmintonTeams(tournament.teamIds ?? []);
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching tournament teams:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tournament = await getBadmintonTournament(id);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (!canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.teamId || typeof body.teamId !== "string") {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const result = await addTeamToBadmintonTournament(id, body.teamId);
    if (typeof result === "string") {
      const status = result === "not-found" || result === "team-not-found" ? 404 : 400;
      return NextResponse.json({ error: result }, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error adding team to tournament:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
