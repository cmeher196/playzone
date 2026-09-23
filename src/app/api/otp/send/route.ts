import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/otp";
import { findByMobile } from "@/lib/registrations";

export const runtime = "nodejs";

const schema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  purpose: z.enum(["register", "reset"]).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid mobile number." },
      { status: 422 },
    );
  }

  const { mobile, purpose } = parsed.data;
  // For "forgot password", only send a code if the number actually has an
  // account — otherwise the user would verify a number that can't be reset.
  if (purpose === "reset" && !(await findByMobile(mobile))) {
    return NextResponse.json(
      { error: "No account found for this number. Please register instead." },
      { status: 404 },
    );
  }

  const result = sendOtp(mobile);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, cooldownMs: result.cooldownMs },
      { status: 429 },
    );
  }

  return NextResponse.json({ sent: true, devCode: result.devCode });
}
