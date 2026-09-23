import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonMatch,
  getBadmintonTournament,
  updateBadmintonMatchStatus,
  updateBadmintonMatchRules,
  editBadmintonMatch,
  deleteBadmintonMatch,
  canManageBadmintonTournament,
  tallyPlayerPoints,
  type BadmintonMatchStatus,
} from "@/lib/badminton-tournaments";

type Context = { params: Promise<{ id: string; matchId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, matchId } = await params;
    const tournament = await getBadmintonTournament(id);
    const match = tournament?.matches.find((m) => m.id === matchId);
    if (!tournament || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ ...match, playerPoints: tallyPlayerPoints(tournament, match) });
  } catch (error) {
    console.error("Error fetching badminton match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const isOwnerOrAdmin = canManageBadmintonTournament(tournament, {
      id: user.id,
      isAdmin: user.role === "admin",
    });

    const body = await request.json();

    const editableKeys = ["courtId", "format", "playerA", "playerB", "playerC", "playerD"];
    const hasEdit = editableKeys.some((k) => k in body);
    const hasRules = "bestOf" in body || "pointsToWin" in body;

    const applyRules = () =>
      updateBadmintonMatchRules(id, matchId, {
        bestOf: typeof body.bestOf === "number" ? body.bestOf : undefined,
        pointsToWin: typeof body.pointsToWin === "number" ? body.pointsToWin : undefined,
      });
    const rulesErrorResponse = (error: "not-found" | "next-started" | "reduce-below-played" | "invalid") => {
      const status = error === "invalid" ? 422 : error === "not-found" ? 404 : 409;
      const message =
        error === "next-started"
          ? "The next round has already started — settings are locked"
          : error === "reduce-below-played"
            ? "Can't reduce games below those already played"
            : error === "invalid"
              ? "Games must be 1–15 and points 5–99"
              : "Match not found";
      return NextResponse.json({ error: message }, { status });
    };

    // Games/points only — editable live by the organizer/admin OR the assigned scorer.
    if (hasRules && !hasEdit && !body.status) {
      const isScorer = match.assignedScorerId === user.id;
      if (!isOwnerOrAdmin && !isScorer) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const result = await applyRules();
      if (!result.ok) return rulesErrorResponse(result.error);
      return NextResponse.json(result.match);
    }

    // Everything below requires the organizer/admin.
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Status transition (start/pause/resume/cancel).
    if (body.status) {
      const updated = await updateBadmintonMatchStatus(id, matchId, body.status as BadmintonMatchStatus);
      if (!updated) {
        return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
      }
      return NextResponse.json(updated);
    }

    // Edit players/court/format and/or games/points (before scoring starts).
    if (hasEdit || hasRules) {
      let current = match;
      if (hasEdit) {
        const result = await editBadmintonMatch(id, matchId, body);
        if (result === "not-found") {
          return NextResponse.json({ error: "Match not found" }, { status: 404 });
        }
        if (result === "locked") {
          return NextResponse.json(
            { error: "This match can't be edited once it is live or has scores" },
            { status: 409 },
          );
        }
        current = result;
      }
      if (hasRules) {
        const result = await applyRules();
        if (!result.ok) return rulesErrorResponse(result.error);
        current = result.match;
      }
      return NextResponse.json(current);
    }

    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  } catch (error) {
    console.error("Error updating badminton match:", error);
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

    if (!canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteBadmintonMatch(id, matchId);
    if (!deleted) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting badminton match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
