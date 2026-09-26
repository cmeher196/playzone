"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Group = { id: string; name: string; teamIds: string[] };
type Team = { id: string; name: string; playerLabel: string };

export function BadmintonGroupManager({
  tournamentId,
  groups,
  advanceCount,
  teams,
  hasGroupMatches,
  hasKnockout,
  groupStageComplete,
}: {
  tournamentId: string;
  groups: Group[];
  advanceCount: number;
  teams: Team[];
  hasGroupMatches: boolean;
  hasKnockout: boolean;
  groupStageComplete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState<null | "group" | "knockout">(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const groupOf = (teamId: string) => groups.find((g) => g.teamIds.includes(teamId))?.id ?? "";
  const unassigned = teams.filter((t) => !groups.some((g) => g.teamIds.includes(t.id)));
  const locked = hasGroupMatches; // group compositions freeze once round-robin matches exist

  async function request(url: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "already-exists") {
          return false; // caller handles the reset confirmation
        }
        setError(data.error ?? "Something went wrong");
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeAdvance(n: number) {
    if (n === advanceCount) return;
    if (await request(`/api/badminton/tournaments/${tournamentId}/groups`, "PATCH", {
      action: "advance",
      advanceCount: n,
    })) {
      router.refresh();
    }
  }

  async function addGroup() {
    if (await request(`/api/badminton/tournaments/${tournamentId}/groups`, "PATCH", { action: "add-group" })) {
      setMessage("Group added");
      router.refresh();
    }
  }

  async function removeGroup(groupId: string) {
    if (await request(`/api/badminton/tournaments/${tournamentId}/groups`, "PATCH", {
      action: "remove-group",
      groupId,
    })) {
      setMessage("Group removed");
      router.refresh();
    }
  }

  async function distribute(shuffle: boolean) {
    if (await request(`/api/badminton/tournaments/${tournamentId}/groups`, "PATCH", {
      action: "distribute",
      shuffle,
    })) {
      setMessage(shuffle ? "Teams reshuffled into groups" : "Teams distributed into groups");
      router.refresh();
    }
  }

  async function moveTeam(teamId: string, toGroupId: string) {
    const payload = groups.map((g) => ({
      id: g.id,
      teamIds: teams
        .filter((t) => (t.id === teamId ? toGroupId : groupOf(t.id)) === g.id)
        .map((t) => t.id),
    }));
    if (await request(`/api/badminton/tournaments/${tournamentId}/groups`, "PATCH", {
      action: "assign",
      groups: payload,
    })) {
      router.refresh();
    }
  }

  async function generate(stage: "group" | "knockout", reset: boolean) {
    const ok = await request(`/api/badminton/tournaments/${tournamentId}/groups/schedule`, "POST", {
      stage,
      reset,
    });
    if (ok) {
      setMessage(
        stage === "group" ? "Group round-robin matches created" : "Knockout bracket created from group winners",
      );
      setConfirmReset(null);
      router.refresh();
    } else if (!error) {
      // Server reported an existing schedule — surface the reset confirmation.
      setConfirmReset(stage);
    }
  }

  async function disable() {
    if (await request(`/api/badminton/tournaments/${tournamentId}/groups`, "DELETE")) {
      setConfirmDisable(false);
      router.refresh();
    }
  }

  const totalAssigned = groups.reduce((n, g) => n + g.teamIds.length, 0);

  return (
    <section className="rounded-2xl border border-orange-300/20 bg-orange-300/[0.04] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Group Stage</h3>
          <p className="mt-1 text-sm text-white/60">
            {groups.length} groups · top {advanceCount} advance · {totalAssigned}/{teams.length} teams placed
          </p>
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      {message && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>}

      {/* Advance per group */}
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="block text-sm text-white/70">Advance per group</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2].map((count) => (
            <button
              key={count}
              type="button"
              disabled={busy}
              onClick={() => changeAdvance(count)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
                advanceCount === count
                  ? "bg-orange-400 text-orange-950"
                  : "border border-white/10 bg-white/5 text-white hover:border-orange-400/50"
              }`}
            >
              Top {count}
            </button>
          ))}
        </div>
      </div>

      {/* Group actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || locked}
          onClick={addGroup}
          className="rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-sm font-medium text-orange-200 transition hover:bg-orange-300/20 disabled:opacity-40"
        >
          + Add group
        </button>
        <button
          type="button"
          disabled={busy || locked || teams.length === 0}
          onClick={() => distribute(false)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-orange-400/50 disabled:opacity-40"
        >
          Auto-distribute
        </button>
        <button
          type="button"
          disabled={busy || locked || teams.length === 0}
          onClick={() => distribute(true)}
          title="Randomly reshuffle every team into the groups"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-orange-400/50 disabled:opacity-40"
        >
          🎲 Shuffle &amp; distribute
        </button>
      </div>

      {locked && (
        <p className="mt-3 text-xs text-amber-300/80">
          Group compositions are locked while group matches exist — regenerate or clear them to edit groups.
        </p>
      )}

      {teams.length === 0 && (
        <p className="mt-3 text-sm text-white/50">Add teams to this tournament to place them into groups.</p>
      )}

      {/* Group columns */}
      {groups.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-orange-200">{group.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">{group.teamIds.length}</span>
                  {!locked && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeGroup(group.id)}
                      title="Delete group"
                      className="rounded-md px-1.5 text-base leading-none text-rose-300/70 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-40"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {group.teamIds.length === 0 && <p className="text-xs text-white/40">Empty</p>}
                {group.teamIds.map((teamId) => (
                  <div key={teamId} className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <p className="truncate text-sm font-medium">{teamName(teamId)}</p>
                    <select
                      value={group.id}
                      disabled={busy || locked}
                      onChange={(e) => moveTeam(teamId, e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-orange-400/50 disabled:opacity-40"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id} className="bg-neutral-900">
                          {g.name}
                        </option>
                      ))}
                      <option value="" className="bg-neutral-900">
                        Unassigned
                      </option>
                    </select>
                  </div>
                ))}
                {!locked && unassigned.length > 0 && (
                  <select
                    value=""
                    disabled={busy}
                    onChange={(e) => e.target.value && moveTeam(e.target.value, group.id)}
                    className="w-full rounded-md border border-dashed border-white/15 bg-transparent px-2 py-1 text-xs text-white/70 outline-none focus:border-orange-400/50 disabled:opacity-40"
                  >
                    <option value="" className="bg-neutral-900">
                      + Add team…
                    </option>
                    {unassigned.map((t) => (
                      <option key={t.id} value={t.id} className="bg-neutral-900">
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unassigned bucket */}
      {unassigned.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3">
          <p className="mb-2 text-xs font-medium text-amber-200">Unassigned teams</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                <span className="text-sm">{t.name}</span>
                <select
                  value=""
                  disabled={busy || locked}
                  onChange={(e) => e.target.value && moveTeam(t.id, e.target.value)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-orange-400/50 disabled:opacity-40"
                >
                  <option value="" className="bg-neutral-900">
                    Move to…
                  </option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-neutral-900">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule actions */}
      <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
        {confirmReset === "group" ? (
          <ConfirmRow
            text="Regenerating group matches deletes all group matches, scores, and the knockout bracket."
            confirmLabel="Delete & regenerate"
            busy={busy}
            onCancel={() => setConfirmReset(null)}
            onConfirm={() => generate("group", true)}
          />
        ) : (
          <button
            type="button"
            disabled={busy || totalAssigned < 2}
            onClick={() => generate("group", false)}
            className="w-full rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-orange-950 transition hover:bg-orange-300 disabled:opacity-50"
          >
            {hasGroupMatches ? "Regenerate group matches" : "Generate group round-robin matches"}
          </button>
        )}

        {hasGroupMatches &&
          (confirmReset === "knockout" ? (
            <ConfirmRow
              text="Regenerating the knockout deletes the current bracket and its scores."
              confirmLabel="Delete & regenerate"
              busy={busy}
              onCancel={() => setConfirmReset(null)}
              onConfirm={() => generate("knockout", true)}
            />
          ) : (
            <button
              type="button"
              disabled={busy || !groupStageComplete}
              title={groupStageComplete ? "Seed the knockout from group standings" : "Finish all group matches first"}
              onClick={() => generate("knockout", false)}
              className="w-full rounded-xl border border-orange-300/30 bg-orange-300/10 px-4 py-2.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-300/20 disabled:opacity-50"
            >
              {hasKnockout ? "Regenerate knockout bracket" : "🏆 Generate knockout from group winners"}
            </button>
          ))}
        {hasGroupMatches && !groupStageComplete && (
          <p className="text-xs text-white/50">Complete every group match to unlock the knockout stage.</p>
        )}
      </div>

      {/* Danger zone */}
      <div className="mt-5 border-t border-white/10 pt-4">
        {confirmDisable ? (
          <ConfirmRow
            text="Turning off the group stage removes all group and knockout matches and their scores."
            confirmLabel="Turn off group stage"
            busy={busy}
            onCancel={() => setConfirmDisable(false)}
            onConfirm={disable}
          />
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDisable(true)}
            className="text-sm text-rose-300/80 transition hover:text-rose-200 disabled:opacity-50"
          >
            Turn off group stage
          </button>
        )}
      </div>
    </section>
  );
}

function ConfirmRow({
  text,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  text: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
      <p className="text-sm text-amber-100">{text}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
