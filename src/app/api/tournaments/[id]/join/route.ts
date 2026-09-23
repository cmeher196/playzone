import { NextResponse } from "next/server";
import { tournamentJoinSchema } from "@/lib/validation";
import { getTournament, joinTournament } from "@/lib/tournaments";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to join a tournament." },
      { status: 401 },
    );
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = tournamentJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 422 },
    );
  }

  const tournament = await getTournament(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (tournament.entryFee > 0 && !parsed.data.transactionId) {
    return NextResponse.json(
      { error: "Enter the UPI reference / UTR after paying the entry fee." },
      { status: 422 },
    );
  }

  const result = await joinTournament(id, {
    playerId: user.id,
    name: user.name,
    transactionId: parsed.data.transactionId ?? "",
    joinedAt: new Date().toISOString(),
  });

  if (result === "not-found") {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (result === "already-joined") {
    return NextResponse.json(
      { error: "You've already joined this tournament." },
      { status: 409 },
    );
  }
  return NextResponse.json({ tournament: result }, { status: 201 });
}
