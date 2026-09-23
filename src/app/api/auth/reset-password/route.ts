import { NextResponse } from "next/server";
import { passwordResetSchema } from "@/lib/validation";
import { findByMobile, updateRecord } from "@/lib/registrations";
import { verifyToken } from "@/lib/otp";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

// Sets a new password after the mobile has been verified via OTP. Doubles as
// "forgot password" and as the way legacy accounts (no password) set one.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 422 },
    );
  }

  const { mobile, verificationToken, password } = parsed.data;
  if (!verifyToken(verificationToken, mobile)) {
    return NextResponse.json(
      { error: "Please verify your mobile number with the OTP first." },
      { status: 401 },
    );
  }

  const user = await findByMobile(mobile);
  if (!user) {
    return NextResponse.json(
      { error: "No account found for this mobile number." },
      { status: 404 },
    );
  }

  await updateRecord(user.id, { passwordHash: hashPassword(password) });
  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true, id: user.id });
}
