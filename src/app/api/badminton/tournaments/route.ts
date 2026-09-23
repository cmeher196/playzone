import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  listBadmintonTournaments,
  createBadmintonTournament,
  type BadmintonTournament,
} from "@/lib/badminton-tournaments";
import { validateBadmintonTournamentInput } from "@/lib/badminton-validation";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tournaments = await listBadmintonTournaments();
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error("Error fetching badminton tournaments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBadmintonTournamentInput(body);

    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const tournament = await createBadmintonTournament({
      ...validation.data!,
      organizerId: user.id,
      organizerName: user.name,
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Error creating badminton tournament:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
