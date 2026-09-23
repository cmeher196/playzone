import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonMatch,
  getBadmintonTournament,
  assignScorer,
  removeScorer,
  canManageBadmintonTournament,
} from "@/lib/badminton-tournaments";
import { validateAssignScorerInput } from "@/lib/badminton-validation";

type Context = { params: Promise<{ id: string; matchId: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, matchId } = await params;
    const tournament = await getBadmintonTournament(id);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const match = await getBadmintonMatch(id, matchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (!canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateAssignScorerInput(body);

    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const updated = await assignScorer(id, matchId, validation.data!.scorerId);

    if (!updated) {
      return NextResponse.json({ error: "Failed to assign scorer" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error assigning badminton scorer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, matchId } = await params;
    const tournament = await getBadmintonTournament(id);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const match = await getBadmintonMatch(id, matchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (!canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await removeScorer(id, matchId);

    if (!updated) {
      return NextResponse.json({ error: "Failed to remove scorer" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error removing badminton scorer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
