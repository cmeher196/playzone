import { NextResponse } from "next/server";
import { setGuestSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await setGuestSessionCookie();
  return NextResponse.json({ name: "Guest" });
}