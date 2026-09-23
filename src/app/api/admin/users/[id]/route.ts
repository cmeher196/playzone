import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { adminUserUpdateSchema } from "@/lib/validation";
import {
  findById,
  updateRecord,
  deleteRecord,
  toPublic,
} from "@/lib/registrations";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const target = await findById(id);
  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 422 },
    );
  }

  // Guard against an admin locking themselves out.
  if (id === admin.id && parsed.data.role && parsed.data.role !== "admin") {
    return NextResponse.json(
      { error: "You can't remove your own admin access." },
      { status: 400 },
    );
  }

  const updated = await updateRecord(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ user: toPublic(updated) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You can't delete your own account." },
      { status: 400 },
    );
  }

  const ok = await deleteRecord(id);
  if (!ok) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
