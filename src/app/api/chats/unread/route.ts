import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUnreadCounts } from "@/lib/chats";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  return NextResponse.json(await getUnreadCounts(user.id));
}
