import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChat, markChatRead } from "@/lib/chats";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const chat = await getChat(id);
  if (!chat) return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  if (!chat.memberIds.includes(user.id)) {
    return NextResponse.json({ error: "You are not a member of this chat." }, { status: 403 });
  }
  await markChatRead(user.id, id);
  return NextResponse.json({ ok: true });
}
