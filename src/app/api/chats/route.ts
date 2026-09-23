import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createChat, listChatsForUser } from "@/lib/chats";
import { listPlayers } from "@/lib/registrations";
import { chatCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  return NextResponse.json({ chats: await listChatsForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = chatCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Choose chat members." },
      { status: 422 },
    );
  }

  const selectedIds = [...new Set(parsed.data.memberIds)].filter((id) => id !== user.id);
  const players = new Map((await listPlayers()).map((player) => [player.id, player]));
  if (selectedIds.some((id) => !players.has(id))) {
    return NextResponse.json({ error: "One or more players were not found." }, { status: 422 });
  }

  const selectedNames = selectedIds.map((id) => players.get(id)!.name);
  const isGroup = selectedIds.length > 1;
  const name = isGroup
    ? parsed.data.name?.trim() || selectedNames.join(", ")
    : selectedNames[0];
  const chat = await createChat({ name, memberIds: selectedIds, createdBy: user.id });
  return NextResponse.json({ chat }, { status: 201 });
}