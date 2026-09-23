"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { appConfig } from "@/lib/config";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const CRICKET_NAV = [
  { href: "/tournaments", label: "Tournaments", icon: "🏆" },
  { href: "/profile", label: "Profile", icon: "👤" },
  { href: "/players", label: "Players", icon: "👥" },
  { href: "/teams/new", label: "Create Team", icon: "🛡️" },
  { href: "/matches", label: "My Matches", icon: "🏏" },
  { href: "/rankings", label: "Rankings", icon: "🏅" },
  { href: "/performance", label: "My Performance", icon: "📊" },
];

const BADMINTON_NAV = [
  { href: "/badminton", label: "Overview", icon: "🏸" },
  { href: "/badminton/tournaments", label: "Tournaments", icon: "🏆" },
  { href: "/badminton/players", label: "Players", icon: "👥" },
  { href: "/badminton/matches", label: "My Matches", icon: "🏸" },
  { href: "/badminton/scoring", label: "Scoring Desk", icon: "📝" },
  { href: "/badminton/rankings", label: "Rankings", icon: "🏅" },
];

export function DashboardShell({
  userName,
  isAdmin = false,
  children,
}: {
  userName: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const badminton = pathname === "/badminton" || pathname.startsWith("/badminton/");
  const nav = badminton ? BADMINTON_NAV : CRICKET_NAV;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <main className="min-h-dvh bg-[var(--page-bg)] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:flex-row md:py-10">
        <aside className="md:w-56 md:shrink-0">
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-lg" aria-hidden>
              {badminton ? "🏸" : "🏏"}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{appConfig.appName}</div>
              <div className="truncate text-xs text-white/50">{badminton ? "Badminton" : "Cricket"} · {userName.split(/\s+/)[0]}</div>
            </div>
          </div>

          <label className="mb-3 block">
            <span className="sr-only">Select sport</span>
            <select
              value={badminton ? "badminton" : "cricket"}
              onChange={(event) => {
                window.location.href = event.target.value === "badminton" ? "/badminton" : "/tournaments";
              }}
              className="w-full rounded-xl border border-white/10 bg-[var(--surface-solid)] px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-emerald-400/60"
            >
              <option value="cricket">🏏 Cricket</option>
              <option value="badminton">🏸 Badminton</option>
            </select>
          </label>

          <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span aria-hidden>🛡️</span>
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowLogoutDialog(true)}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <span aria-hidden>🚪</span>
              Log out
            </button>
          </nav>

          <div className="mt-3 md:mt-4">
            <ThemeSwitcher />
          </div>
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
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
            aria-labelledby="logout-dialog-title"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--page-bg)] p-6 shadow-2xl shadow-black/50"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-400/15 text-xl text-rose-300">
              🚪
            </div>
            <h2 id="logout-dialog-title" className="text-lg font-semibold text-white">
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
    </main>
  );
}
