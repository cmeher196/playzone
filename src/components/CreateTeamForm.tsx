"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Team } from "@/lib/teams";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-400/20";

export function CreateTeamForm({ tournamentId, existingTeams = [] }: { tournamentId?: string; existingTeams?: Pick<Team, "id" | "name">[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sourceTeamId, setSourceTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(tournamentId ? `/api/tournaments/${tournamentId}/teams` : "/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logo: logo.trim() || undefined,
          ...(sourceTeamId ? { sourceTeamId } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        team?: { id: string };
      };
      if (!res.ok || !data.team) {
        setError(data.error ?? "Couldn't create the team.");
        return;
      }
      if (logoFile) {
        const logoBody = new FormData();
        logoBody.append("logo", logoFile);
        const logoRes = await fetch(`/api/teams/${data.team.id}/logo`, {
          method: "POST",
          body: logoBody,
        });
        if (!logoRes.ok) {
          const logoData = (await logoRes.json().catch(() => ({}))) as { error?: string };
          setError(logoData.error ?? "Team created, but the logo upload failed.");
          return;
        }
      }
      router.push(`/teams/${data.team.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div>
        {existingTeams.length > 0 && (
          <div className="mb-5">
            <label htmlFor="reuse-team" className="mb-1.5 block text-sm font-medium text-emerald-100/80">Add an existing team</label>
            <select id="reuse-team" value={sourceTeamId} onChange={(e) => {
              const selectedId = e.target.value;
              setSourceTeamId(selectedId);
              const selectedTeam = existingTeams.find((team) => team.id === selectedId);
              if (selectedTeam) setName(selectedTeam.name);
            }} className={inputClass}>
              <option value="" className="bg-[#0a1712]">Create a new team</option>
              {existingTeams.map((team) => <option key={team.id} value={team.id} className="bg-[#0a1712]">{team.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-white/40">The existing squad will be added to this tournament without being copied.</p>
          </div>
        )}
        <label htmlFor="team-name" className="mb-1.5 block text-sm font-medium text-emerald-100/80">
          Team name
        </label>
        <input
          id="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Royal Strikers"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="team-logo" className="mb-1.5 block text-sm font-medium text-emerald-100/80">
          Logo <span className="text-white/40">(image, emoji, or initials)</span>
        </label>
        <input
          id="team-logo"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="🦁"
          maxLength={8}
          className={inputClass}
        />
        <input
          id="team-logo-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-200"
        />
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create team"}
      </button>
    </form>
  );
}
