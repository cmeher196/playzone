"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicPlayer } from "@/lib/registrations";
import { GENDERS, PLAYER_TYPES } from "@/lib/validation";

const ROLE_BADGE: Record<string, string> = {
  admin: "border-amber-400/30 bg-amber-400/15 text-amber-300",
  player: "border-white/15 bg-white/5 text-white/60",
};

const ROLE_ICONS: Record<string, string> = {
  Batsman: "🏏",
  Bowler: "🎯",
  "All-Rounder": "⭐",
  "Wicket-Keeper": "🧤",
};

type EditFields = {
  name: string;
  gender: (typeof GENDERS)[number];
  age: number;
  playerType: (typeof PLAYER_TYPES)[number];
};

export function AdminDashboard({
  accounts,
  currentAdminId,
}: {
  accounts: PublicPlayer[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const roleOf = (a: PublicPlayer) => (a.role === "admin" ? "admin" : "player");

  const stats = useMemo(() => {
    const admins = accounts.filter((a) => roleOf(a) === "admin").length;
    return { total: accounts.length, admins, players: accounts.length - admins };
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.mobile.includes(q) ||
        a.id.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  async function callApi(id: string, init: RequestInit) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, init);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Action failed. Please try again.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function setRole(id: string, role: "admin" | "player") {
    void callApi(id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Delete ${name}'s account? This can't be undone.`)) return;
    void callApi(id, { method: "DELETE" });
  }

  async function saveEdit(id: string, form: EditFields) {
    const ok = await callApi(id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (ok) setEditingId(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Accounts" value={stats.total} />
        <StatCard label="Admins" value={stats.admins} />
        <StatCard label="Players" value={stats.players} />
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, mobile, or ID"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
      />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
          No accounts found.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => {
            const role = roleOf(a);
            const isSelf = a.id === currentAdminId;
            const busy = busyId === a.id;
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg" aria-hidden>
                        {ROLE_ICONS[a.playerType] ?? "🏏"}
                      </span>
                      <span className="font-semibold text-white">{a.name}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[role]}`}
                      >
                        {role}
                      </span>
                      {isSelf && (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-white/50">
                      {a.playerType} · {a.gender} · {a.age} yrs
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-white/60">
                      <span>📱 +91 {a.mobile}</span>
                      <span className="font-mono text-emerald-300/80">{a.id}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setEditingId(editingId === a.id ? null : a.id)
                      }
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {editingId === a.id ? "Close" : "Edit"}
                    </button>
                    {role === "admin" ? (
                      <button
                        type="button"
                        disabled={busy || isSelf}
                        onClick={() => setRole(a.id, "player")}
                        title={isSelf ? "You can't change your own role" : undefined}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40"
                      >
                        Remove admin
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRole(a.id, "admin")}
                        className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-50"
                      >
                        Make admin
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || isSelf}
                      onClick={() => remove(a.id, a.name)}
                      title={isSelf ? "You can't delete your own account" : undefined}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingId === a.id && (
                  <EditForm
                    account={a}
                    busy={busy}
                    onCancel={() => setEditingId(null)}
                    onSave={(form) => saveEdit(a.id, form)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs uppercase tracking-wide text-white/40">
        {label}
      </div>
    </div>
  );
}

function EditForm({
  account,
  busy,
  onCancel,
  onSave,
}: {
  account: PublicPlayer;
  busy: boolean;
  onCancel: () => void;
  onSave: (form: EditFields) => void;
}) {
  const [name, setName] = useState(account.name);
  const [gender, setGender] = useState<EditFields["gender"]>(account.gender);
  const [age, setAge] = useState(String(account.age));
  const [playerType, setPlayerType] = useState<EditFields["playerType"]>(
    account.playerType,
  );

  const field =
    "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60";

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
      <label className="text-xs text-white/50">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
      </label>
      <label className="text-xs text-white/50">
        Age
        <input
          type="number"
          min={8}
          max={70}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className={field}
        />
      </label>
      <label className="text-xs text-white/50">
        Gender
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as EditFields["gender"])}
          className={field}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g} className="bg-[#0a1712]">
              {g}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-white/50">
        Playing role
        <select
          value={playerType}
          onChange={(e) =>
            setPlayerType(e.target.value as EditFields["playerType"])
          }
          className={field}
        >
          {PLAYER_TYPES.map((p) => (
            <option key={p} value={p} className="bg-[#0a1712]">
              {p}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave({ name, gender, age: Number(age), playerType })}
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
