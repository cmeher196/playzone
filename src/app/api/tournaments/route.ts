import { NextResponse } from "next/server";
import { tournamentCreateSchema } from "@/lib/validation";
import { listTournaments, createTournament } from "@/lib/tournaments";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const tournaments = await listTournaments();
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to create a tournament." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = tournamentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 422 },
    );
  }

  const tournament = await createTournament({
    ...parsed.data,
    organizerId: user.id,
    organizerName: user.name,
  });
  return NextResponse.json({ tournament }, { status: 201 });
}
