// This file structure is incorrect. Use /api/badminton/tournaments/[id]/matches/[matchId] instead.
// Leaving this as a placeholder to prevent 404s.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Use /api/badminton/tournaments/[id]/matches/[matchId] instead" }, { status: 404 });
}
