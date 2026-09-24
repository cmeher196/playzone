import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAuction, isAuctionOwner, settleCurrent } from "@/lib/auctions";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const id = (await params).id;
  const auction = await getAuction(id);
  if (!user || !auction) return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  if (!isAuctionOwner(auction, { id: user.id, isAdmin: isAdmin(user) })) return NextResponse.json({ error: "Only the auction organizer can settle players." }, { status: 403 });
  let body: { result?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.result !== "sold" && body.result !== "unsold") return NextResponse.json({ error: "Choose sold or unsold." }, { status: 422 });
  const result = await settleCurrent(id, body.result);
  return result === "not-found" ? NextResponse.json({ error: "Auction not found." }, { status: 404 }) : result === "invalid" ? NextResponse.json({ error: "No active player to settle." }, { status: 409 }) : NextResponse.json({ auction: result });
}
