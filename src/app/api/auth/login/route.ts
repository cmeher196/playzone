import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { findByMobile } from "@/lib/registrations";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { seedAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 422 },
    );
  }

  // Make sure the configured admin account exists before authenticating.
  await seedAdmin();

  const user = await findByMobile(parsed.data.mobile);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Incorrect mobile number or password." },
      { status: 401 },
    );
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ id: user.id, name: user.name });
}
