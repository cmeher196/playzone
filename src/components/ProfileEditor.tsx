"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENDERS, PLAYER_TYPES } from "@/lib/validation";
import type { PublicPlayer } from "@/lib/registrations";
import { OtpVerify } from "./OtpVerify";

const MOBILE_RE = /^[6-9]\d{9}$/;

const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";
const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-400/20";
const chip = (active: boolean) =>
  `rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
    active
      ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
      : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
  }`;

type Message = { type: "success" | "error"; text: string } | null;

export function ProfileEditor({ user }: { user: PublicPlayer }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(String(user.age));
  const [gender, setGender] = useState<PublicPlayer["gender"]>(user.gender);
  const [playerType, setPlayerType] = useState<PublicPlayer["playerType"]>(
    user.playerType,
  );

  const [mobile, setMobile] = useState(user.mobile);
  const [editingMobile, setEditingMobile] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [verifiedMobile, setVerifiedMobile] = useState("");
  const mobileChanged = mobile !== user.mobile;
  const mobileVerified =
    !!verifiedToken && verifiedMobile === mobile && MOBILE_RE.test(mobile);

  const [photos, setPhotos] = useState<string[]>(user.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<Message>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (verifiedMobile && mobile !== verifiedMobile) {
      setVerifiedToken(null);
      setVerifiedMobile("");
    }
  }, [mobile, verifiedMobile]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (mobileChanged && !mobileVerified) {
      setMessage({ type: "error", text: "Verify your new mobile number first." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: Number(age),
          gender,
          playerType,
          mobile,
          ...(mobileChanged ? { verificationToken: verifiedToken } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string; user?: PublicPlayer };
      if (!res.ok || !data.user) {
        setMessage({ type: "error", text: data.error ?? "Couldn't save changes." });
        return;
      }
      setEditingMobile(false);
      setVerifiedToken(null);
      setVerifiedMobile("");
      setMessage({ type: "success", text: "Profile updated." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwMessage({
        type: "error",
        text: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords don't match." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setPwMessage({
          type: "error",
          text: data.error ?? "Couldn't update your password.",
        });
        return;
      }
      setPwMessage({ type: "success", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setPwSaving(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMessage(null);
    setUploading(true);
    try {
      const body = new FormData();
      Array.from(files).forEach((f) => body.append("photos", f));
      const res = await fetch("/api/profile/photos", { method: "POST", body });
      const data = (await res.json()) as { error?: string; photos?: string[] };
      if (!res.ok || !data.photos) {
        setMessage({ type: "error", text: data.error ?? "Upload failed." });
        return;
      }
      setPhotos(data.photos);
    } catch {
      setMessage({ type: "error", text: "Network error during upload." });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function deletePhoto(path: string) {
    setMessage(null);
    try {
      const res = await fetch("/api/profile/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = (await res.json()) as { error?: string; photos?: string[] };
      if (!res.ok || !data.photos) {
        setMessage({ type: "error", text: data.error ?? "Couldn't remove photo." });
        return;
      }
      setPhotos(data.photos);
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) return;
      window.location.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-emerald-400/15">
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0]} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-emerald-200">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-white">{user.name}</h2>
          <p className="font-mono text-sm text-emerald-300">{user.id}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className="shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Log out
        </button>
      </div>

      {showLogoutDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loggingOut) {
              setShowLogoutDialog(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-logout-dialog-title"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--page-bg)] p-6 shadow-2xl shadow-black/50"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-400/15 text-xl text-rose-300">
              🚪
            </div>
            <h2 id="profile-logout-dialog-title" className="text-lg font-semibold text-white">
              Log out of CricArena?
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              You will need to sign in again to access your account.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={logout}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={saveDetails}
        noValidate
        className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      >
        <h3 className="text-base font-semibold text-white">Your details</h3>

        <div>
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className={labelClass}>Gender</span>
            <div className="grid grid-cols-3 gap-2">
              {GENDERS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setGender(option)}
                  className={chip(gender === option)}
                >
                  {option}
                </button>
              ))}
            </div>
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
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <span className={labelClass}>Playing role</span>
          <div className="grid grid-cols-2 gap-2.5">
            {PLAYER_TYPES.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setPlayerType(option)}
                className={chip(playerType === option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Mobile number</span>
          {!editingMobile ? (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-white">+91 {user.mobile}</span>
              <button
                type="button"
                onClick={() => setEditingMobile(true)}
                className="text-sm font-medium text-emerald-300/80 transition hover:text-emerald-200"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <span className="flex items-center border-r border-white/10 px-3.5 text-sm text-white/60">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className="w-full bg-transparent px-3.5 py-3 text-base text-white outline-none"
                />
              </div>
              {mobileChanged && (
                <OtpVerify
                  mobile={mobile}
                  verified={mobileVerified}
                  onVerified={(m, token) => {
                    setVerifiedMobile(m);
                    setVerifiedToken(token);
                  }}
                  verifiedLabel="New number verified"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setMobile(user.mobile);
                  setEditingMobile(false);
                }}
                className="text-sm font-medium text-white/50 transition hover:text-white/80"
              >
                Cancel change
              </button>
            </div>
          )}
        </div>

        {message && (
          <p
            className={
              message.type === "success"
                ? "text-sm text-emerald-300"
                : "text-sm text-rose-400"
            }
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form
        onSubmit={changePassword}
        noValidate
        className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      >
        <h3 className="text-base font-semibold text-white">Change password</h3>

        <div>
          <label htmlFor="currentPassword" className={labelClass}>
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>

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

        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {pwMessage && (
          <p
            className={
              pwMessage.type === "success"
                ? "text-sm text-emerald-300"
                : "text-sm text-rose-400"
            }
          >
            {pwMessage.text}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={pwSaving}
            onClick={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPwMessage(null);
            }}
            className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={pwSaving}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Photos</h3>
          <span className="text-xs text-white/40">{photos.length} / 12</span>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {photos.map((src) => (
              <div key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Player" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => deletePhoto(src)}
                  aria-label="Delete photo"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-[#ffffff] opacity-0 transition hover:bg-rose-500 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">
            No photos yet. Add a few to build your player profile.
          </p>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => uploadPhotos(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading || photos.length >= 12}
          className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload photos"}
        </button>
        <p className="text-xs text-white/40">JPG, PNG, or WebP · up to 5 MB each.</p>
      </div>
    </div>
  );
}
