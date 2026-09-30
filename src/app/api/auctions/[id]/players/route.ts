import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAuction, registerPlayerForAuction, withdrawPlayerFromAuction, isAuctionOwner } from "@/lib/auctions";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function toResponse(result: Awaited<ReturnType<typeof registerPlayerForAuction>>) {
  if (result === "not-found") return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  if (result === "not-setup") return NextResponse.json({ error: "Registration is closed — the auction has already started." }, { status: 409 });
  if (result === "already-registered") return NextResponse.json({ error: "Already registered for this auction." }, { status: 409 });
  if (result === "invalid") return NextResponse.json({ error: "You're not registered for this auction." }, { status: 422 });
  return NextResponse.json({ auction: result });
}

// Any registered player can add themselves to the auction's player pool.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role === "guest") return NextResponse.json({ error: "Sign in to register for an auction." }, { status: 403 });
  const id = (await params).id;
  const result = await registerPlayerForAuction(id, { id: user.id, name: user.name, playerType: user.playerType });
  return toResponse(result);
}

// A player withdraws themselves; the owner/admin may remove anyone.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const id = (await params).id;
  const auction = await getAuction(id);
  if (!auction) return NextResponse.json({ error: "Auction not found." }, { status: 404 });

  let body: { registrationId?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const registrationId = typeof body.registrationId === "string" ? body.registrationId : user.id;
  if (registrationId !== user.id && !isAuctionOwner(auction, { id: user.id, isAdmin: isAdmin(user) })) {
    return NextResponse.json({ error: "You can only withdraw yourself." }, { status: 403 });
  }
  const result = await withdrawPlayerFromAuction(id, registrationId);
  return toResponse(result);
}
