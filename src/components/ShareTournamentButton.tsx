"use client";

import { useState } from "react";

export function ShareTournamentButton({ href, label = "Share invite" }: { href: string; label?: string }) {
  const [message, setMessage] = useState("");

  async function share() {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Tournament invitation", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Invite link copied.");
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setMessage("Couldn't share the link.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={share}
        className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
      >
        ↗ {label}
      </button>
      {message && <span className="text-xs text-emerald-300">{message}</span>}
    </div>
  );
}