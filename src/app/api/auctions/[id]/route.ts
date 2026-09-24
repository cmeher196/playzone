import { NextResponse } from "next/server";
import { getAuction } from "@/lib/auctions";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auction = await getAuction((await params).id);
  return auction ? NextResponse.json({ auction }) : NextResponse.json({ error: "Auction not found." }, { status: 404 });
}
