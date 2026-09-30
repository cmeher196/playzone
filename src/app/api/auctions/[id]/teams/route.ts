import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAuction, registerTeamForAuction, withdrawTeamFromAuction, isAuctionOwner } from "@/lib/auctions";
import { getTeam } from "@/lib/teams";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function toResponse(result: Awaited<ReturnType<typeof registerTeamForAuction>>) {
  if (result === "not-found") return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  if (result === "not-setup") return NextResponse.json({ error: "Registration is closed — the auction has already started." }, { status: 409 });
  if (result === "already-registered") return NextResponse.json({ error: "This team is already in the auction." }, { status: 409 });
  if (result === "invalid") return NextResponse.json({ error: "That team isn't in this auction." }, { status: 422 });
  return NextResponse.json({ auction: result });
}

// Only the auction owner (or an admin) may add teams — see the design note
// in the SDD: team registration is not self-service, unlike players.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const id = (await params).id;
  const auction = await getAuction(id);
  if (!auction) return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  if (!isAuctionOwner(auction, { id: user.id, isAdmin: isAdmin(user) })) {
    return NextResponse.json({ error: "Only the auction organizer can add teams." }, { status: 403 });
  }

  let body: { teamId?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.teamId !== "string" || !body.teamId) {
    return NextResponse.json({ error: "Choose a team to add." }, { status: 422 });
  }
  const team = await getTeam(body.teamId);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  const result = await registerTeamForAuction(id, { id: team.id, name: team.name });
  return toResponse(result);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const id = (await params).id;
  const auction = await getAuction(id);
  if (!auction) return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  if (!isAuctionOwner(auction, { id: user.id, isAdmin: isAdmin(user) })) {
    return NextResponse.json({ error: "Only the auction organizer can remove teams." }, { status: 403 });
  }

  let body: { teamId?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.teamId !== "string" || !body.teamId) {
    return NextResponse.json({ error: "Choose a team to remove." }, { status: 422 });
  }

  const result = await withdrawTeamFromAuction(id, body.teamId);
  return toResponse(result);
}
