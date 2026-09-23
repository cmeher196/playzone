import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createTeam, listTeams } from "@/lib/teams";
import { teamCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ teams: await listTeams() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = teamCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
  }
  const team = await createTeam({
    name: parsed.data.name,
    logo: parsed.data.logo,
    ownerId: user.id,
    ownerName: user.name,
  });
  return NextResponse.json({ team }, { status: 201 });
}
