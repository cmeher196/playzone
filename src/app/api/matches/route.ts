import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createLiveMatch } from "@/lib/live-matches";
import type { TeamRef } from "@/lib/live-scoring";

export const runtime = "nodejs";

function teamRef(id: string, name: unknown, players: unknown): TeamRef | null {
  if (typeof name !== "string" || name.trim().length < 2) return null;
  if (!Array.isArray(players) || players.length < 2) return null;
  const normalized = players.filter(
    (player): player is string => typeof player === "string" && player.trim().length >= 2,
  );
  if (normalized.length < 2) return null;
  return {
    teamId: id,
    name: name.trim(),
    players: normalized.map((player, index) => ({
      playerId: `${id}-player-${index + 1}`,
      name: player.trim(),
    })),
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "guest") {
    return NextResponse.json({ error: "Create an account to organize a match." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const teamA = teamRef("direct-a", body.teamAName, body.teamAPlayers);
  const teamB = teamRef("direct-b", body.teamBName, body.teamBPlayers);
  const overs = body.overs;
  const date = body.date;
  const tossWinnerId = body.tossWinnerId;
  const tossDecision = body.tossDecision;
  if (!teamA || !teamB || teamA.name === teamB.name) {
    return NextResponse.json({ error: "Enter two different teams with at least two players each." }, { status: 422 });
  }
  if (typeof overs !== "number" || !Number.isInteger(overs) || overs < 1 || overs > 50) {
    return NextResponse.json({ error: "Enter between 1 and 50 overs." }, { status: 422 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Choose a valid match date." }, { status: 422 });
  }
  if ((tossWinnerId !== teamA.teamId && tossWinnerId !== teamB.teamId) || (tossDecision !== "bat" && tossDecision !== "bowl")) {
    return NextResponse.json({ error: "Choose a valid toss result." }, { status: 422 });
  }

  const match = await createLiveMatch({
    ownerId: user.id,
    teamA,
    teamB,
    overs,
    venue: typeof body.venue === "string" ? body.venue.trim() || undefined : undefined,
    date,
    tossWinnerTeamId: tossWinnerId,
    tossDecision,
  });
  return NextResponse.json({ match }, { status: 201 });
}