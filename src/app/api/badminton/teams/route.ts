import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listBadmintonTeams, createBadmintonTeam } from "@/lib/badminton-teams";
import { validateCreateBadmintonTeamInput } from "@/lib/badminton-validation";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teams = await listBadmintonTeams();
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching badminton teams:", error);
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
    const validation = validateCreateBadmintonTeamInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const result = await createBadmintonTeam({
      ...validation.data!,
      ownerId: user.id,
      ownerName: user.name,
    });

    if (typeof result === "string") {
      return NextResponse.json({ error: result }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating badminton team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
