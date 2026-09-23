"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Team, TeamPlayer } from "@/lib/teams";

export function ManageTeam({
  team,
  eligible,
}: {
  team: Team;
  eligible: (TeamPlayer & { mobile: string })[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerNumber, setPlayerNumber] = useState("1");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [logo, setLogo] = useState(team.logo ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  async function call(url: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
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
      setBusy(false);
    }
  }

  async function addPlayer() {
    if (!selected || !playerNumber) return;
    const ok = await call(`/api/teams/${team.id}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: selected, playerNumber }),
    });
    if (ok) {
      setSelected("");
      setPlayerNumber("1");
    }
  }

  function removePlayer(playerId: string) {
    void call(`/api/teams/${team.id}/players/${playerId}`, { method: "DELETE" });
  }

  function setRole(field: "captainId" | "viceCaptainId", playerId: string) {
    void call(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: playerId }),
    });
  }

  async function saveDetails() {
    if (name.trim().length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }
    const ok = await call(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), logo: logo.trim() || undefined }),
    });
    if (ok && logoFile) {
      const body = new FormData();
      body.append("logo", logoFile);
      const res = await fetch(`/api/teams/${team.id}/logo`, { method: "POST", body });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Logo upload failed.");
        return;
      }
    }
    if (ok) {
      setLogoFile(null);
      setEditing(false);
    }
  }

  function deleteTeam() {
    if (!confirm(`Delete team "${team.name}"? This can't be undone.`)) return;
    setBusy(true);
    setError(null);
    fetch(`/api/teams/${team.id}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Couldn't delete the team.");
          setBusy(false);
          return;
        }
        router.push(`/tournaments/${team.tournamentId}`);
        router.refresh();
      })
      .catch(() => {
        setError("Network error. Please try again.");
        setBusy(false);
      });
  }

  const pill =
    "rounded-lg border px-2 py-1 text-xs font-medium transition disabled:opacity-40";
  const matchingPlayers = eligible.filter((player) => {
    const query = playerQuery.trim().toLowerCase();
    return !query || player.name.toLowerCase().includes(query) || player.mobile.includes(query);
  });

  return (
    <div className="space-y-5 rounded-3xl border border-amber-300/20 bg-amber-400/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-amber-200">Manage team</h2>
        <button
          type="button"
          onClick={deleteTeam}
          disabled={busy}
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
        >
          🗑️ Delete team
        </button>
      </div>

      {editing ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          />
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:col-span-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-xl">
              {logo?.startsWith("/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Current team logo" className="h-full w-full object-cover" />
              ) : (
                logo || "🏏"
              )}
            </div>
            <label className="min-w-0 cursor-pointer text-sm font-medium text-emerald-300 transition hover:text-emerald-200">
              <span>Upload team photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                aria-label="Team logo image"
                className="sr-only"
              />
              <span className="mt-0.5 block truncate text-xs font-normal text-white/50">
                {logoFile?.name ?? "Choose a JPG, PNG, or WEBP image"}
              </span>
            </label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={saveDetails}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(team.name);
                setLogo(team.logo ?? "");
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          ✏️ Edit name &amp; logo
        </button>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-emerald-100/80">
          Add player
        </label>
        <input
          value={playerQuery}
          onChange={(e) => setPlayerQuery(e.target.value)}
          placeholder="Search by name or mobile number"
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
        />
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            <option value="" className="bg-[#0a1712]">
              Select a CricArena player…
            </option>
            {matchingPlayers.map((p) => (
              <option key={p.playerId} value={p.playerId} className="bg-[#0a1712]">
                {p.name} · {p.mobile}
              </option>
            ))}
          </select>
          <label className="w-28 shrink-0 text-xs text-white/50">
            Jersey no.
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={playerNumber}
              onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, "").slice(0, 3))}
              aria-label="Jersey number"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            />
          </label>
          <button
            type="button"
            onClick={addPlayer}
            disabled={busy || !selected || !/^\d{1,3}$/.test(playerNumber)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {eligible.length === 0 && (
          <p className="mt-1 text-xs text-white/40">
            All registered players are already in this team.
          </p>
        )}
      </div>

      {team.players.length > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-medium text-emerald-100/80">
            Squad &amp; roles
          </div>
          <ul className="space-y-1.5">
            {team.players.map((p) => {
              const isCaptain = team.captainId === p.playerId;
              const isVice = team.viceCaptainId === p.playerId;
              return (
                <li
                  key={p.playerId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white">{p.playerNumber !== undefined ? `#${p.playerNumber} ` : ""}{p.name}</span>
                  <span className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy || isVice}
                      onClick={() => setRole("captainId", p.playerId)}
                      className={`${pill} ${isCaptain ? "border-amber-400/40 bg-amber-400/15 text-amber-300" : "border-white/10 text-white/60 hover:bg-white/10"}`}
                    >
                      {isCaptain ? "Captain ✓" : "Make C"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || isCaptain}
                      onClick={() => setRole("viceCaptainId", p.playerId)}
                      className={`${pill} ${isVice ? "border-sky-400/40 bg-sky-400/15 text-sky-300" : "border-white/10 text-white/60 hover:bg-white/10"}`}
                    >
                      {isVice ? "VC ✓" : "Make VC"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removePlayer(p.playerId)}
                      className={`${pill} border-rose-500/30 text-rose-300 hover:bg-rose-500/10`}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
