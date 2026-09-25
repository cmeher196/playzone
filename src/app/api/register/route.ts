import { NextResponse } from "next/server";
import { registrationApiSchema } from "@/lib/validation";
import { addRegistration, findByMobile, updateRecord } from "@/lib/registrations";
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

  const { password, ...data } = parsed.data;

  const existing = await findByMobile(data.mobile);
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "This mobile number is already registered." },
      { status: 409 },
    );
  }

  // A team owner may have already added this mobile number as an
  // unregistered player (see api/teams/[teamId]/players/route.ts) — that
  // creates a passwordless placeholder record so it can be picked for
  // squads/matches right away. When that person actually registers, "claim"
  // the placeholder in place (same id) instead of creating a second record,
  // so all of their historical match performances, stats, tournament
  // participation, and rankings — everything keyed by player id — stay
  // linked to the account they can now log into.
  const record = existing
    ? await updateRecord(existing.id, { ...data, passwordHash: hashPassword(password) })
    : await addRegistration({ ...data, passwordHash: hashPassword(password) });
  if (!record) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await setSessionCookie(record.id);
  return NextResponse.json(
    { id: record.id, registeredAt: record.registeredAt },
    { status: 201 },
  );
}
