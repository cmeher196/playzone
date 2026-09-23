import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTournament,
  canManageBadmintonTournament,
  applyScorePoint,
  undoLastScore,
} from "@/lib/badminton-tournaments";

type Context = { params: Promise<{ id: string; matchId: string }> };

const CONFLICT_CODES = new Set(["conflict"]);

export async function POST(request: NextRequest, { params }: Context) {
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

    const isOwnerOrAdmin = canManageBadmintonTournament(tournament, {
      id: user.id,
      isAdmin: user.role === "admin",
    });

    const body = (await request.json()) as {
      action?: "point" | "undo";
      side?: "playerA" | "playerB";
      playerId?: string;
      expectedSequence?: number;
    };

    if (body.action === "undo") {
      const result = await undoLastScore({
        tournamentId: id,
        matchId,
        scorerUserId: user.id,
        isOwnerOrAdmin,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 422 });
      }
      return NextResponse.json({ match: result.match, sequence: result.sequence, playerPoints: result.playerPoints });
    }

    if (body.side !== "playerA" && body.side !== "playerB") {
      return NextResponse.json({ error: "side must be playerA or playerB" }, { status: 400 });
    }

    const result = await applyScorePoint({
      tournamentId: id,
      matchId,
      scorerUserId: user.id,
      isOwnerOrAdmin,
      side: body.side,
      playerId: body.playerId,
      expectedSequence: body.expectedSequence,
    });

    if (!result.ok) {
      const status = CONFLICT_CODES.has(result.code) ? 409 : 422;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ match: result.match, sequence: result.sequence, playerPoints: result.playerPoints });
  } catch (error) {
    console.error("Error scoring badminton match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
