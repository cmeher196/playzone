import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAuction, listAuctions } from "@/lib/auctions";
import { getTournament, canManageTournament } from "@/lib/tournaments";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ auctions: await listAuctions() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "guest") return NextResponse.json({ error: "Sign in to create an auction." }, { status: 403 });
  let body: {
    name?: unknown;
    purse?: unknown;
    defaultBasePrice?: unknown;
    date?: unknown;
    time?: unknown;
    tournamentId?: unknown;
    venue?: unknown;
    description?: unknown;
  };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (
    typeof body.name !== "string" || body.name.trim().length < 3 ||
    typeof body.purse !== "number" || body.purse < 1 ||
    typeof body.defaultBasePrice !== "number" || body.defaultBasePrice < 1
  ) {
    return NextResponse.json({ error: "Enter an auction name, purse per team, and default base price." }, { status: 422 });
  }
  const date = typeof body.date === "string" && body.date ? body.date : undefined;
  const time = typeof body.time === "string" && body.time ? body.time : undefined;
  const tournamentId = typeof body.tournamentId === "string" && body.tournamentId ? body.tournamentId : undefined;
  const venue = typeof body.venue === "string" && body.venue.trim() ? body.venue.trim().slice(0, 120) : undefined;
  const description = typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 500) : undefined;
  if (tournamentId) {
    const tournament = await getTournament(tournamentId);
    if (!tournament || !canManageTournament(tournament, { id: user.id, isAdmin: isAdmin(user) })) {
      return NextResponse.json({ error: "You can only link a tournament you organize." }, { status: 403 });
    }
  }
  try {
    const auction = await createAuction({
      name: body.name.trim(),
      purse: body.purse,
      defaultBasePrice: body.defaultBasePrice,
      date,
      time,
      tournamentId,
      venue,
      description,
      ownerId: user.id,
      ownerName: user.name,
    });
    return NextResponse.json({ auction }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create auction." }, { status: 422 }); }
}
