"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpVerify } from "./OtpVerify";

const MOBILE_RE = /^[6-9]\d{9}$/;

const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";
const errorClass = "mt-1.5 text-sm text-rose-400";
const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-400/20";
const primaryBtn =
  "w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3.5 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60";

function MobileField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor="mobile" className={labelClass}>
        Mobile number
      </label>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/5 transition focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-400/20">
        <span className="flex items-center border-r border-white/10 px-3.5 text-sm text-white/60">
          +91
        </span>
        <input
          id="mobile"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="w-full bg-transparent px-3.5 py-3 text-base text-white outline-none placeholder:text-white/30"
        />
      </div>
    </div>
  );
}

export function LoginForm({ redirectTo = "/tournaments" }: { redirectTo?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [verifiedMobile, setVerifiedMobile] = useState("");
  const verified =
    !!verifiedToken && verifiedMobile === mobile && MOBILE_RE.test(mobile);

  useEffect(() => {
    if (verifiedMobile && mobile !== verifiedMobile) {
      setVerifiedToken(null);
      setVerifiedMobile("");
    }
  }, [mobile, verifiedMobile]);

  function switchMode(next: "login" | "reset") {
    setMode(next);
    setError(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const trimmedMobile = mobile.trim();
      const trimmedPassword = password.trim();
      if (!MOBILE_RE.test(trimmedMobile)) {
        setError("Enter a valid 10-digit mobile number.");
        return;
      }
      if (trimmedPassword.length === 0) {
        setError("Enter your password.");
        return;
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: trimmedMobile, password: trimmedPassword }),
      });
      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        setError(`Login failed (${res.status}). Please try again.`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Login failed (${res.status}). Please try again.`);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!verifiedToken) {
      setError("Verify your mobile number with the OTP first.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile,
          verificationToken: verifiedToken,
          password: newPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't set your password.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "reset") {
    return (
      <form onSubmit={handleReset} noValidate className="space-y-5">
        <p className="text-sm text-white/60">
          Verify your mobile number and set a new password.
        </p>
        <MobileField value={mobile} onChange={setMobile} />
        <OtpVerify
          mobile={mobile}
          verified={verified}
          purpose="reset"
          onVerified={(m, token) => {
            setVerifiedMobile(m);
            setVerifiedToken(token);
          }}
        />
        {verified && (
          <div>
            <label htmlFor="newPassword" className={labelClass}>
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
        {error && <p className={errorClass}>{error}</p>}
        <button type="submit" disabled={busy || !verified} className={primaryBtn}>
          {busy ? "Saving…" : "Set password & sign in"}
        </button>
        <button
          type="button"
          onClick={() => switchMode("login")}
          className="w-full text-center text-sm font-medium text-emerald-300/80 transition hover:text-emerald-200"
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} noValidate className="space-y-5">
      <MobileField value={mobile} onChange={setMobile} />
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && <p className={errorClass}>{error}</p>}
      <button
        type="submit"
        className={primaryBtn}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => switchMode("reset")}
        className="w-full text-center text-sm font-medium text-emerald-300/80 transition hover:text-emerald-200"
      >
        Forgot password? Set a new one
      </button>
    </form>
  );
}
