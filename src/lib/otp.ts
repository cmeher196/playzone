import crypto from "node:crypto";

/**
 * Mobile OTP verification — dev/mock implementation.
 *
 * The code is generated and stored in-memory (fine for `next dev`, a single
 * Node process). For production / serverless, replace `store` with Redis or a
 * DB that supports TTL, and replace `deliverOtp()` with a real provider:
 *   - India SMS (free tier): Fast2SMS or MSG91  (DLT-approved template needed)
 *   - Email OTP (free tier): Resend or SMTP/Nodemailer
 *
 * On successful verification we issue a short-lived HMAC-signed token that the
 * registration endpoint checks, so the "verified" state is stateless and cannot
 * be forged from the client.
 */

const OTP_TTL_MS = 5 * 60 * 1000; // code valid for 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // min gap between sends
const MAX_ATTEMPTS = 5; // verify attempts per code
const TOKEN_TTL_MS = 15 * 60 * 1000; // verified token valid for 15 minutes

const isDev = process.env.NODE_ENV !== "production";
const secret = process.env.OTP_SECRET ?? "dev-insecure-otp-secret-change-me";

type OtpEntry = {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
};

const store = new Map<string, OtpEntry>();

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Mock delivery. Swap the body for a real SMS/email provider call. */
function deliverOtp(mobile: string, code: string): void {
  console.log(`[OTP] Code for +91${mobile}: ${code} (valid 5 min)`);
}

export type SendResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: string; cooldownMs: number };

export function sendOtp(mobile: string): SendResult {
  const now = Date.now();
  const existing = store.get(mobile);
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      error: "Please wait a moment before requesting another code.",
      cooldownMs: RESEND_COOLDOWN_MS - (now - existing.lastSentAt),
    };
  }

  const code = generateCode();
  store.set(mobile, {
    code,
    expiresAt: now + OTP_TTL_MS,
    lastSentAt: now,
    attempts: 0,
  });
  deliverOtp(mobile, code);

  // Expose the code to the client only in development to make testing easy.
  return isDev ? { ok: true, devCode: code } : { ok: true };
}

export type VerifyResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export function verifyOtp(mobile: string, code: string): VerifyResult {
  const entry = store.get(mobile);
  const now = Date.now();

  if (!entry || now > entry.expiresAt) {
    store.delete(mobile);
    return { ok: false, error: "Code expired. Please request a new one." };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(mobile);
    return { ok: false, error: "Too many attempts. Please request a new code." };
  }

  entry.attempts += 1;
  if (code !== entry.code) {
    return { ok: false, error: "Incorrect code. Please try again." };
  }

  store.delete(mobile);
  return { ok: true, token: issueToken(mobile) };
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function issueToken(mobile: string): string {
  const payload = `${mobile}.${Date.now() + TOKEN_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

/** Returns true only if `token` was issued by us for `mobile` and is unexpired. */
export function verifyToken(token: string, mobile: string): boolean {
  const dot = token.indexOf(".");
  if (dot < 1) return false;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString();
  } catch {
    return false;
  }

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const [tokenMobile, expStr] = payload.split(".");
  const exp = Number(expStr);
  return tokenMobile === mobile && Number.isFinite(exp) && Date.now() <= exp;
}
