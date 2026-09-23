"use client";

import { useEffect, useState } from "react";

const MOBILE_RE = /^[6-9]\d{9}$/;

const errorClass = "mt-1.5 text-sm text-rose-400";
const smallBtn =
  "shrink-0 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Send + verify a mobile OTP. Calls `onVerified(mobile, token)` with a signed
 * token the server trusts. Resets itself whenever `mobile` changes.
 */
export function OtpVerify({
  mobile,
  verified,
  onVerified,
  verifiedLabel = "Mobile number verified",
  purpose,
}: {
  mobile: string;
  verified: boolean;
  onVerified: (mobile: string, token: string) => void;
  verifiedLabel?: string;
  purpose?: "register" | "reset";
}) {
  const valid = MOBILE_RE.test(mobile);
  const [phase, setPhase] = useState<"unsent" | "sent">("unsent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    setPhase("unsent");
    setCode("");
    setDevCode(null);
    setError(null);
    setResendIn(0);
  }, [mobile]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, purpose }),
      });
      const data = (await res.json()) as { devCode?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't send the code. Try again.");
        return;
      }
      setPhase("sent");
      setDevCode(data.devCode ?? null);
      setResendIn(30);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? "Verification failed. Try again.");
        return;
      }
      onVerified(mobile, data.token);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (verified) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-300">
        <span aria-hidden>✓</span> {verifiedLabel}
      </div>
    );
  }

  if (!valid) return null;

  return (
    <div className="mt-2.5 space-y-2">
      {phase === "unsent" ? (
        <button type="button" onClick={send} disabled={busy} className={smallBtn}>
          {busy ? "Sending…" : "Send OTP"}
        </button>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit code"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base tracking-[0.3em] text-white outline-none transition placeholder:tracking-normal placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
            />
            <button
              type="button"
              onClick={verify}
              disabled={busy || code.length !== 6}
              className={smallBtn}
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-white/50">
            <button
              type="button"
              onClick={send}
              disabled={busy || resendIn > 0}
              className="font-medium text-emerald-300/80 transition hover:text-emerald-200 disabled:text-white/40"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
            {devCode && (
              <span className="text-emerald-300/70">Dev code: {devCode}</span>
            )}
          </div>
        </>
      )}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}
