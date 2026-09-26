import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTournament,
  canManageBadmintonTournament,
  configureBadmintonGroupStage,
  distributeBadmintonGroups,
  assignBadmintonGroups,
  disableBadmintonGroupStage,
  addBadmintonGroup,
  removeBadmintonGroup,
  setBadmintonGroupAdvanceCount,
} from "@/lib/badminton-tournaments";

type Context = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const tournament = await getBadmintonTournament(id);
  if (!tournament) return { error: NextResponse.json({ error: "Tournament not found" }, { status: 404 }) };
  if (!canManageBadmintonTournament(tournament, { id: user.id, isAdmin: user.role === "admin" })) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, tournament };
}

// Create or reconfigure the group stage.
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      groupCount?: number;
      advanceCount?: number;
      distribute?: boolean;
    };

    const result = await configureBadmintonGroupStage(id, {
      groupCount: Number(body.groupCount),
      advanceCount: Number(body.advanceCount),
      autoDistribute: body.distribute ?? true,
    });

    if (result === "not-found") return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (result === "invalid") {
      return NextResponse.json({ error: "Invalid group configuration" }, { status: 400 });
    }
    if (result === "locked") {
      return NextResponse.json(
        { error: "Matches have already been scored — reset them before reshaping groups" },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error configuring badminton group stage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Distribute teams automatically or apply a manual placement.
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      action?: "distribute" | "assign" | "add-group" | "remove-group" | "advance";
      shuffle?: boolean;
      groups?: { id: string; teamIds: string[] }[];
      groupId?: string;
      advanceCount?: number;
    };

    let result;
    switch (body.action) {
      case "assign":
        result = await assignBadmintonGroups(id, Array.isArray(body.groups) ? body.groups : []);
        break;
      case "add-group":
        result = await addBadmintonGroup(id);
        break;
      case "remove-group":
        result = await removeBadmintonGroup(id, String(body.groupId ?? ""));
        break;
      case "advance":
        result = await setBadmintonGroupAdvanceCount(id, Number(body.advanceCount));
        break;
      default:
        result = await distributeBadmintonGroups(id, { shuffle: body.shuffle });
    }

    if (result === "not-found") return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (result === "no-groups") {
      return NextResponse.json({ error: "This tournament has no group stage" }, { status: 400 });
    }
    if (result === "invalid") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (result === "locked") {
      return NextResponse.json(
        { error: "Group matches already exist — regenerate them after changing groups" },
        { status: 409 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating badminton groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Turn the group stage off (removes group + knockout matches).
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth.error) return auth.error;

    const result = await disableBadmintonGroupStage(id);
    if (result === "not-found") return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error disabling badminton group stage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
