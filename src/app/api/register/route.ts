import { NextResponse } from "next/server";
import { registrationApiSchema } from "@/lib/validation";
import { addRegistration, isMobileRegistered } from "@/lib/registrations";
import { verifyToken } from "@/lib/otp";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = registrationApiSchema.safeParse(payload);
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

  const { verificationToken, password, ...data } = parsed.data;
  if (!verifyToken(verificationToken, data.mobile)) {
    return NextResponse.json(
      { error: "Please verify your mobile number with the OTP first." },
      { status: 401 },
    );
  }

  if (await isMobileRegistered(data.mobile)) {
    return NextResponse.json(
      { error: "This mobile number is already registered." },
      { status: 409 },
    );
  }

  const record = await addRegistration({
    ...data,
    passwordHash: hashPassword(password),
  });
  await setSessionCookie(record.id);
  return NextResponse.json(
    { id: record.id, registeredAt: record.registeredAt },
    { status: 201 },
  );
}
