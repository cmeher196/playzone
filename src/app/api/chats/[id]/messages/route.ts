import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createChatMessage, getChat, listChatMessages } from "@/lib/chats";
import { chatMessageSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function accessChat(chatId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in.", status: 401 } as const;
  const chat = await getChat(chatId);
  if (!chat) return { error: "Chat not found.", status: 404 } as const;
  if (!chat.memberIds.includes(user.id)) {
    return { error: "You are not a member of this chat.", status: 403 } as const;
  }
  return { user, chat } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await accessChat(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  return NextResponse.json({ messages: await listChatMessages(id) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await accessChat(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Write a message." }, { status: 422 });
  }
  const message = await createChatMessage({
    conversationId: id,
    senderId: access.user.id,
    senderName: access.user.name,
    text: parsed.data.text,
  });
  return NextResponse.json({ message }, { status: 201 });
}