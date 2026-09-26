import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTournament,
  canManageBadmintonTournament,
  generateGroupStageMatches,
  generateKnockoutFromGroups,
} from "@/lib/badminton-tournaments";

type Context = { params: Promise<{ id: string }> };

// Generate the group round-robin (stage="group") or the knockout bracket seeded
// from the group standings (stage="knockout").
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tournament = await getBadmintonTournament(id);
    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    if (!canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { stage?: "group" | "knockout"; reset?: boolean };
    const stage = body.stage === "knockout" ? "knockout" : "group";

    const result =
      stage === "knockout"
        ? await generateKnockoutFromGroups(id, { reset: body.reset })
        : await generateGroupStageMatches(id, { reset: body.reset });

    if (result === "not-found") return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (result === "no-groups") {
      return NextResponse.json({ error: "This tournament has no group stage" }, { status: 400 });
    }
    if (result === "no-courts") {
      return NextResponse.json({ error: "This tournament has no courts" }, { status: 400 });
    }
    if (result === "not-enough-teams") {
      return NextResponse.json({ error: "Not enough teams assigned to groups" }, { status: 400 });
    }
    if (result === "group-stage-missing") {
      return NextResponse.json({ error: "Generate the group matches first" }, { status: 400 });
    }
    if (result === "group-stage-incomplete") {
      return NextResponse.json(
        { error: "Finish every group match before generating the knockout", code: "group-stage-incomplete" },
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
    console.error("Error generating badminton group schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
