import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTournament,
  canManageBadmintonTournament,
  generateKnockoutSchedule,
} from "@/lib/badminton-tournaments";

type Context = { params: Promise<{ id: string }> };

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

    const body = (await request.json()) as { format?: "singles" | "doubles"; reset?: boolean };
    const format = body.format === "doubles" ? "doubles" : "singles";

    const result = await generateKnockoutSchedule({ tournamentId: id, format, reset: body.reset });

    if (result === "tournament-not-found") {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (result === "no-courts") {
      return NextResponse.json({ error: "This tournament has no courts" }, { status: 400 });
    }
    if (result === "not-enough-players") {
      return NextResponse.json(
        { error: `Not enough available players for ${format}` },
        { status: 400 },
      );
    }
    if (result === "already-exists") {
      return NextResponse.json(
        { error: "A schedule already exists. Regenerate to replace it.", code: "already-exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error generating badminton schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
