import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBadmintonTournament, joinBadmintonTournament } from "@/lib/badminton-tournaments";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to join this tournament." }, { status: 401 });
  }

  const { id } = await params;
  const tournament = await getBadmintonTournament(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const result = await joinBadmintonTournament(id, user.id);
  if (result === "not-found") {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (result === "already-joined") {
    return NextResponse.json({ error: "You've already joined this tournament." }, { status: 409 });
  }
  return NextResponse.json({ tournament: result }, { status: 201 });
}