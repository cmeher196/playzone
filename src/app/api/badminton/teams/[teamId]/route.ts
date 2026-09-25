import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getBadmintonTeam,
  updateBadmintonTeam,
  deleteBadmintonTeam,
  canManageBadmintonTeam,
} from "@/lib/badminton-teams";

type Context = { params: Promise<{ teamId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    const team = await getBadmintonTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("Error fetching badminton team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    const team = await getBadmintonTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (!canManageBadmintonTeam(team, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const patch: { name?: string; logo?: string; playerIds?: string[] } = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.logo === "string") patch.logo = body.logo;
    if (Array.isArray(body.playerIds)) patch.playerIds = body.playerIds;

    const result = await updateBadmintonTeam(teamId, patch);
    if (typeof result === "string") {
      const status = result === "not-found" ? 404 : 400;
      return NextResponse.json({ error: result }, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating badminton team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;
    const team = await getBadmintonTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (!canManageBadmintonTeam(team, { id: user.id, isAdmin: user.role === "admin" })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteBadmintonTeam(teamId);
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting badminton team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
