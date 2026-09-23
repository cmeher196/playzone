import { NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/validation";
import { findByMobile, updateRecord, toPublic } from "@/lib/registrations";
import { getSessionUser } from "@/lib/auth";
import { verifyToken } from "@/lib/otp";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const current = await getSessionUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fieldErrors },
      { status: 422 },
    );
  }

  const { verificationToken, ...fields } = parsed.data;

  // Changing the mobile number requires a fresh OTP and must stay unique.
  if (fields.mobile !== current.mobile) {
    if (!verificationToken || !verifyToken(verificationToken, fields.mobile)) {
      return NextResponse.json(
        { error: "Verify your new mobile number with an OTP first." },
        { status: 401 },
      );
    }
    const existing = await findByMobile(fields.mobile);
    if (existing && existing.id !== current.id) {
      return NextResponse.json(
        { error: "That mobile number is already registered." },
        { status: 409 },
      );
    }
  }

  const updated = await updateRecord(current.id, fields);
  if (!updated) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ user: toPublic(updated) });
}
