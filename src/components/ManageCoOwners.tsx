"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CoOwnerEntry = { userId: string; name: string; mobile: string };

const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const buttonClass = "rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-50";

/** Lets the owner (or an existing co-owner/admin) grant or revoke co-owner
 * management rights on a team. Co-owners can manage the team exactly like
 * the owner: edit details, add/remove players, and manage other co-owners. */
export function ManageCoOwners({
  teamId,
  coOwners,
}: {
  teamId: string;
  coOwners: CoOwnerEntry[];
}) {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/teams/${teamId}/co-owners`;

  async function addCoOwner() {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Couldn't add the co-owner.");
        return;
      }
      setMobile("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCoOwner(userId: string) {
    setRemoving(userId);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Couldn't remove the co-owner.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/50">
        Co-owners can manage this team just like you — edit details, add or remove players, and manage other co-owners.
      </p>
      {coOwners.length === 0 ? (
        <p className="text-sm text-white/40">No co-owners yet.</p>
      ) : (
        <ul className="space-y-2">
          {coOwners.map((coOwner) => (
            <li key={coOwner.userId} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="text-white">{coOwner.name} <span className="text-white/40">· {coOwner.mobile}</span></span>
              <button
                type="button"
                onClick={() => removeCoOwner(coOwner.userId)}
                disabled={removing !== null}
                className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
              >
                {removing === coOwner.userId ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={mobile}
          onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Co-owner's 10-digit mobile number"
          inputMode="numeric"
          className={inputClass}
        />
        <button type="button" onClick={addCoOwner} disabled={busy || !mobile} className={buttonClass}>
          {busy ? "Adding…" : "Add co-owner"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
