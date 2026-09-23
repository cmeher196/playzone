import { NextResponse } from "next/server";
import { passwordChangeSchema } from "@/lib/validation";
import { findById, updateRecord } from "@/lib/registrations";
import { getSessionUser, verifyPassword, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

// Change the signed-in user's password. The current password is verified first
// (skipped only for legacy accounts that never set one).
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 422 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  const record = await findById(session.id);
  if (!record) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (record.passwordHash) {
    if (!currentPassword || !verifyPassword(currentPassword, record.passwordHash)) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 401 },
      );
    }
    if (verifyPassword(newPassword, record.passwordHash)) {
      return NextResponse.json(
        { error: "New password must be different from your current one." },
        { status: 422 },
      );
    }
  }

  await updateRecord(record.id, { passwordHash: hashPassword(newPassword) });
  return NextResponse.json({ ok: true });
}
