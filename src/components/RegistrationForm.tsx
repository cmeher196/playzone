"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  registrationFormSchema,
  type RegistrationFormInput,
  PLAYER_TYPES,
  GENDERS,
} from "@/lib/validation";

const PLAYER_TYPE_ICONS: Record<(typeof PLAYER_TYPES)[number], string> = {
  Batsman: "🏏",
  Bowler: "🎯",
  "All-Rounder": "⭐",
  "Wicket-Keeper": "🧤",
};

const MOBILE_RE = /^[6-9]\d{9}$/;

type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; id: string; name: string };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-400/20";
const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";
const errorClass = "mt-1.5 text-sm text-rose-400";

export function RegistrationForm({ redirectTo = "/profile" }: { redirectTo?: string }) {
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormInput>({
    resolver: zodResolver(registrationFormSchema),
    mode: "onBlur",
    defaultValues: { name: "", mobile: "", password: "" },
  });

  const mobile = watch("mobile") ?? "";
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [verifiedMobile, setVerifiedMobile] = useState("");
  const mobileVerified =
    !!verifiedToken && verifiedMobile === mobile && MOBILE_RE.test(mobile);

  // Editing the mobile after verifying invalidates the verification.
  useEffect(() => {
    if (verifiedMobile && mobile !== verifiedMobile) {
      setVerifiedToken(null);
      setVerifiedMobile("");
    }
  }, [mobile, verifiedMobile]);

  const onSubmit = handleSubmit(async (values) => {
    if (!verifiedToken || verifiedMobile !== values.mobile) {
      setSubmit({
        status: "error",
        message: "Please verify your mobile number with the OTP first.",
      });
      return;
    }
    setSubmit({ status: "idle" });
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, verificationToken: verifiedToken }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setSubmit({
          status: "error",
          message: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      setSubmit({ status: "success", id: data.id ?? "", name: values.name });
      setVerifiedToken(null);
      setVerifiedMobile("");
      reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmit({
        status: "error",
        message:
          "Network error. Please check your connection and try again.",
      });
    }
  });

  if (submit.status === "success") {
    return (
      <SuccessCard
        id={submit.id}
        name={submit.name}
        redirectTo={redirectTo}
        onReset={() => setSubmit({ status: "idle" })}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-7">
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white">Your details</h2>

        <div>
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Virat Kohli"
            aria-invalid={!!errors.name}
            className={inputClass}
            {...register("name")}
          />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

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
              aria-invalid={!!errors.mobile}
              className="w-full bg-transparent px-3.5 py-3 text-base text-white outline-none placeholder:text-white/30"
              {...register("mobile")}
            />
          </div>
          {errors.mobile && (
            <p className={errorClass}>{errors.mobile.message}</p>
          )}
          <MobileVerification
            mobile={mobile}
            verified={mobileVerified}
            onVerified={(m, token) => {
              setVerifiedMobile(m);
              setVerifiedToken(token);
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className={labelClass}>Gender</span>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {GENDERS.map((option) => {
                    const active = field.value === option;
                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => field.onChange(option)}
                        className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                          active
                            ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.gender && (
              <p className={errorClass}>{errors.gender.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="age" className={labelClass}>
              Age
            </label>
            <input
              id="age"
              type="number"
              inputMode="numeric"
              min={8}
              max={70}
              step={1}
              placeholder="e.g. 24"
              aria-invalid={!!errors.age}
              className={inputClass}
              {...register("age", { valueAsNumber: true })}
            />
            {errors.age && <p className={errorClass}>{errors.age.message}</p>}
          </div>
        </div>

        <div>
          <span className={labelClass}>Playing role</span>
          <Controller
            control={control}
            name="playerType"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2.5">
                {PLAYER_TYPES.map((option) => {
                  const active = field.value === option;
                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => field.onChange(option)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                        active
                          ? "border-emerald-400 bg-emerald-400/15 text-emerald-100"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                      }`}
                    >
                      <span className="text-xl">
                        {PLAYER_TYPE_ICONS[option]}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.playerType && (
            <p className={errorClass}>{errors.playerType.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Create a password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            aria-invalid={!!errors.password}
            className={inputClass}
            {...register("password")}
          />
          {errors.password ? (
            <p className={errorClass}>{errors.password.message}</p>
          ) : (
            <p className="mt-1.5 text-sm text-white/40">
              Use your mobile number and this password to log in later.
            </p>
          )}
        </div>
      </section>

      {submit.status === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <span aria-hidden>⚠️</span>
          <span>{submit.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !mobileVerified}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3.5 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Submitting…" : "Complete Registration"}
      </button>
      {!mobileVerified && (
        <p className="text-center text-xs text-amber-300/80">
          Verify your mobile number to enable registration.
        </p>
      )}
      <p className="text-center text-xs text-white/40">
        By registering you agree to the league rules &amp; fair-play policy.
      </p>
    </form>
  );
}

function MobileVerification({
  mobile,
  verified,
  onVerified,
}: {
  mobile: string;
  verified: boolean;
  onVerified: (mobile: string, token: string) => void;
}) {
  const valid = MOBILE_RE.test(mobile);
  const [phase, setPhase] = useState<"unsent" | "sent">("unsent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Reset the widget whenever the target number changes.
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
        body: JSON.stringify({ mobile }),
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
        <span aria-hidden>✓</span> Mobile number verified
      </div>
    );
  }

  if (!valid) return null;

  const smallBtn =
    "shrink-0 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50";

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

function SuccessCard({
  id,
  name,
  redirectTo,
  onReset,
}: {
  id: string;
  name: string;
  redirectTo: string;
  onReset: () => void;
}) {
  const firstName = name.trim().split(/\s+/)[0];
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-3xl">
        🎉
      </div>
      <h2 className="text-2xl font-bold text-white">You&apos;re registered!</h2>
      <p className="mt-2 text-white/60">
        Welcome aboard{firstName ? `, ${firstName}` : ""}! Your spot is
        confirmed.
      </p>
      <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-[11px] uppercase tracking-wide text-white/40">
          Registration ID
        </div>
        <div className="mt-1 font-mono text-xl font-semibold text-emerald-300">
          {id}
        </div>
      </div>
      <p className="mt-4 text-sm text-white/50">
        Save this ID. You&apos;re signed in — add photos and update your details
        anytime from your profile.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2.5">
        <Link
          href={redirectTo}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-2.5 text-center text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
        >
          {redirectTo.startsWith("/join/") ? "Continue to tournament" : "Go to my profile"}
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Register another player
        </button>
      </div>
    </div>
  );
}
