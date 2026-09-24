import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAuction, isAuctionOwner, startNextPlayer } from "@/lib/auctions";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const id = (await params).id;
  const auction = await getAuction(id);
  if (!user || !auction) return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  if (!isAuctionOwner(auction, { id: user.id, isAdmin: isAdmin(user) })) return NextResponse.json({ error: "Only the auction organizer can control bidding." }, { status: 403 });
  const result = await startNextPlayer(id);
  if (result === "complete") return NextResponse.json({ auction: await getAuction(id), complete: true });
  return NextResponse.json({ auction: result });
}
