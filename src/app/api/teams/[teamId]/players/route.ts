import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTeam, addPlayerToTeam, canManageTeamForUser } from "@/lib/teams";
import { newTeamPlayerSchema, teamAddPlayerSchema } from "@/lib/validation";
import { addRegistration, findById, isMobileRegistered } from "@/lib/registrations";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  if (!(await canManageTeamForUser(team, { id: user.id, isAdmin: isAdmin(user) }))) {
    return NextResponse.json(
      { error: "You can't manage this team." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = body as { playerId?: unknown; playerNumber?: unknown; newPlayer?: unknown };
  let playerId: string;
  let playerName: string;
  let playerNumber = typeof raw.playerNumber === "string" ? raw.playerNumber : "1";

  if (raw.newPlayer !== undefined) {
    const newPlayer = newTeamPlayerSchema.safeParse(raw.newPlayer);
    if (!newPlayer.success) {
      return NextResponse.json({ error: newPlayer.error.issues[0]?.message ?? "Enter valid player details." }, { status: 422 });
    }
    if (await isMobileRegistered(newPlayer.data.mobile)) {
      return NextResponse.json({ error: "A player with this mobile number already exists. Search and select them instead." }, { status: 409 });
    }
    const created = await addRegistration({
      name: newPlayer.data.name,
      mobile: newPlayer.data.mobile,
      gender: "Other",
      age: 18,
      playerType: "All-Rounder",
      battingHand: "Right-Handed",
      bowlingStyle: "Does Not Bowl",
    });
    playerId = created.id;
    playerName = created.name;
  } else {
    const parsed = teamAddPlayerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Select a player." }, { status: 422 });
    }
    playerId = parsed.data.playerId;
    playerNumber = parsed.data.playerNumber;
    const player = await findById(playerId);
    if (!player) {
      return NextResponse.json({ error: "That CricArena player was not found." }, { status: 422 });
    }
    playerName = player.name;
  }

  const player = await findById(playerId);
  if (!player) {
    return NextResponse.json(
      { error: "That CricArena player was not found." },
      { status: 422 },
    );
  }

  const result = await addPlayerToTeam(teamId, {
    playerId,
    name: playerName,
    playerNumber,
  });
  if (result === "not-found") {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
  if (result === "already-in-team") {
    return NextResponse.json(
      { error: "Player is already in this team." },
      { status: 409 },
    );
  }
  if (result === "in-other-team") {
    return NextResponse.json(
      { error: "Player is already in another team in this tournament." },
      { status: 409 },
    );
  }
  return NextResponse.json({ team: result }, { status: 201 });
}
