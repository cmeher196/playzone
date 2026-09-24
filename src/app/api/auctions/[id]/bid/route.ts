import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAuction, isAuctionOwner, placeBid } from "@/lib/auctions";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const id = (await params).id;
  const auction = await getAuction(id);
  if (!user || !auction) return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  if (!isAuctionOwner(auction, { id: user.id, isAdmin: isAdmin(user) })) return NextResponse.json({ error: "Only the auction organizer can control bids." }, { status: 403 });
  let body: { teamId?: unknown; amount?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.teamId !== "string" || typeof body.amount !== "number") return NextResponse.json({ error: "Choose a team and bid amount." }, { status: 422 });
  const result = await placeBid(id, body.teamId, body.amount);
  return result === "not-found" ? NextResponse.json({ error: "Auction not found." }, { status: 404 }) : result === "invalid" ? NextResponse.json({ error: "Bid must be higher than the current bid and within the team's purse." }, { status: 422 }) : NextResponse.json({ auction: result });
}
