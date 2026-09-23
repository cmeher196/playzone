import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { findById, updateRecord } from "@/lib/registrations";

export const runtime = "nodejs";

const MAX_PHOTOS = 12;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per photo
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const uploadsRoot = path.join(process.cwd(), "public", "uploads");

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  const record = await findById(user.id);
  const photos = record?.photos ?? [];
  if (photos.length + files.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `You can upload up to ${MAX_PHOTOS} photos.` },
      { status: 400 },
    );
  }

  const dir = path.join(uploadsRoot, user.id);
  await fs.mkdir(dir, { recursive: true });

  const added: string[] = [];
  for (const file of files) {
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Only JPG, PNG, or WebP images are allowed." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Each photo must be 5 MB or smaller." },
        { status: 400 },
      );
    }
    const name = `${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, name), bytes);
    added.push(`/uploads/${user.id}/${name}`);
  }

  const updated = await updateRecord(user.id, { photos: [...photos, ...added] });
  return NextResponse.json({ photos: updated?.photos ?? [] });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { path?: string };
  try {
    body = (await request.json()) as { path?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const target = body.path ?? "";
  // Only allow deleting the caller's own files; block path traversal.
  const allowed = new RegExp(`^/uploads/${user.id}/[A-Za-z0-9._-]+$`);
  if (!allowed.test(target)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const record = await findById(user.id);
  const photos = record?.photos ?? [];
  if (!photos.includes(target)) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  await fs
    .unlink(path.join(process.cwd(), "public", target))
    .catch(() => undefined);

  const updated = await updateRecord(user.id, {
    photos: photos.filter((p) => p !== target),
  });
  return NextResponse.json({ photos: updated?.photos ?? [] });
}
