import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createBadmintonTournament, listBadmintonTournaments } from "@/lib/badminton";
import { badmintonTournamentCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() { return NextResponse.json({ tournaments: await listBadmintonTournaments() }); }
export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = badmintonTournamentCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid tournament" }, { status: 422 });
  return NextResponse.json({ tournament: await createBadmintonTournament({ ...parsed.data, organizerId: user.id, organizerName: user.name }) }, { status: 201 });
}