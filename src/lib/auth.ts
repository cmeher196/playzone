import crypto from "node:crypto";
import { cookies } from "next/headers";
import { findById, toPublic, type PublicPlayer } from "./registrations";

/**
 * Authentication helpers.
 *
 * Passwords are hashed with scrypt (random per-password salt). Sessions are a
 * short HMAC-signed token stored in an httpOnly cookie, so no server-side
 * session store is needed. For production set AUTH_SECRET in the environment.
 */

const secret =
  process.env.AUTH_SECRET ??
  process.env.OTP_SECRET ??
  "dev-insecure-auth-secret-change-me";

const SESSION_COOKIE = "cric_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt.${salt.toString("base64url")}.${key.toString("base64url")}`;
}

export function verifyPassword(
  password: string,
  stored: string | undefined,
): boolean {
  if (!stored) return false;
  const [scheme, saltB64, keyB64] = stored.split(".");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const actual = crypto.scryptSync(
    password,
    Buffer.from(saltB64, "base64url"),
    expected.length,
  );
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionToken(id: string): string {
  const payload = `${id}.${Date.now() + SESSION_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString();
  } catch {
    return null;
  }

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const [id, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!id || !Number.isFinite(exp) || Date.now() > exp) return null;
  return id;
}

export async function setSessionCookie(id: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the logged-in player (without password hash) or null. */
export async function getSessionUser(): Promise<PublicPlayer | null> {
  const store = await cookies();
  const id = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const user = await findById(id);
  return user ? toPublic(user) : null;
}
