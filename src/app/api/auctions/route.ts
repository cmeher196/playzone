import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAuction, listAuctions } from "@/lib/auctions";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ auctions: await listAuctions() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "guest") return NextResponse.json({ error: "Sign in to create an auction." }, { status: 403 });
  let body: { name?: unknown; purse?: unknown; teamIds?: unknown; playerIds?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.name !== "string" || body.name.trim().length < 3 || typeof body.purse !== "number" || body.purse < 1 || !Array.isArray(body.teamIds) || !Array.isArray(body.playerIds)) {
    return NextResponse.json({ error: "Enter an auction name, purse, teams, and players." }, { status: 422 });
  }
  try {
    const auction = await createAuction({ name: body.name.trim(), purse: body.purse, ownerId: user.id, ownerName: user.name, teamIds: body.teamIds.filter((id): id is string => typeof id === "string"), playerIds: body.playerIds.filter((id): id is string => typeof id === "string") });
    return NextResponse.json({ auction }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create auction." }, { status: 422 }); }
}
