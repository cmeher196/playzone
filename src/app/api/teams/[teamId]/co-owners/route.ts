import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  getTeam,
  canManageTeamForUser,
  addTeamCoOwner,
  removeTeamCoOwner,
} from "@/lib/teams";
import { findByMobile } from "@/lib/registrations";
import { addScorerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  if (!(await canManageTeamForUser(team, { id: user.id, isAdmin: isAdmin(user) }))) {
    return NextResponse.json({ error: "You can't manage this team." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = addScorerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid mobile number." },
      { status: 422 },
    );
  }

  const player = await findByMobile(parsed.data.mobile);
  if (!player) {
    return NextResponse.json({ error: "No registered player with that mobile number." }, { status: 404 });
  }
  if (player.id === team.ownerId) {
    return NextResponse.json({ error: "This player already owns the team." }, { status: 409 });
  }

  const result = await addTeamCoOwner(teamId, { userId: player.id, name: player.name, mobile: player.mobile });
  if (result === "not-found") return NextResponse.json({ error: "Team not found." }, { status: 404 });
  if (result === "already-co-owner") return NextResponse.json({ error: "This player is already a co-owner." }, { status: 409 });
  return NextResponse.json({ team: result }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  if (!(await canManageTeamForUser(team, { id: user.id, isAdmin: isAdmin(user) }))) {
    return NextResponse.json({ error: "You can't manage this team." }, { status: 403 });
  }

  let body: { userId?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.userId !== "string" || !body.userId) {
    return NextResponse.json({ error: "Choose a co-owner to remove." }, { status: 422 });
  }

  const result = await removeTeamCoOwner(teamId, body.userId);
  if (result === "not-found") return NextResponse.json({ error: "Team not found." }, { status: 404 });
  return NextResponse.json({ team: result });
}
