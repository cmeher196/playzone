import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { canManageTeamForUser, getTeam, updateTeam } from "@/lib/teams";

export const runtime = "nodejs";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  if (!(await canManageTeamForUser(team, { id: user.id, isAdmin: isAdmin(user) }))) {
    return NextResponse.json({ error: "You can't manage this team." }, { status: 403 });
  }
  const form = await request.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a logo image." }, { status: 400 });
  const extension = extensions[file.type];
  if (!extension) return NextResponse.json({ error: "Only JPG, PNG, or WebP images are allowed." }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Logo must be 2 MB or smaller." }, { status: 400 });
  const directory = path.join(process.cwd(), "public", "uploads", "teams", teamId);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  const logo = `/uploads/teams/${teamId}/${filename}`;
  const updated = await updateTeam(teamId, { logo });
  return NextResponse.json({ team: updated });
}
