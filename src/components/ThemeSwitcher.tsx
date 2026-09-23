"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "cricarena-theme";
const CHANGE_EVENT = "cricarena-theme-change";

type ThemeId =
  | "system"
  | "emerald"
  | "midnight"
  | "ocean"
  | "sunset"
  | "grape"
  | "light"
  | "indigo-light";

type ThemeMeta = {
  id: ThemeId;
  label: string;
  hint: string;
  bg: string;
  accent: string;
};

const THEMES: ThemeMeta[] = [
  { id: "system", label: "System", hint: "Match your device", bg: "linear-gradient(135deg,#050d09 50%,#f2f6f4 50%)", accent: "#10b981" },
  { id: "emerald", label: "Emerald", hint: "Dark · green", bg: "#050d09", accent: "#10b981" },
  { id: "midnight", label: "Midnight", hint: "Dark · indigo", bg: "#0b1020", accent: "#818cf8" },
  { id: "ocean", label: "Ocean", hint: "Dark · cyan", bg: "#071a20", accent: "#22d3ee" },
  { id: "sunset", label: "Sunset", hint: "Dark · orange", bg: "#170f0a", accent: "#fb923c" },
  { id: "grape", label: "Grape", hint: "Dark · fuchsia", bg: "#150a18", accent: "#e879f9" },
  { id: "light", label: "Light", hint: "Light · green", bg: "#f2f6f4", accent: "#10b981" },
  { id: "indigo-light", label: "Indigo Light", hint: "Light · indigo", bg: "#f3f4fb", accent: "#6366f1" },
];

const LIGHT_THEMES = new Set(["light", "indigo-light"]);

function resolveTheme(stored: ThemeId): string {
  if (stored === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "emerald";
  }
  return stored;
}

function applyTheme(stored: ThemeId) {
  const theme = resolveTheme(stored);
  const el = document.documentElement;
  el.setAttribute("data-theme", theme);
  el.setAttribute("data-mode", LIGHT_THEMES.has(theme) ? "light" : "dark");
}

// Read the persisted choice through an external store so render stays
// hydration-safe without setState-in-effect.
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): ThemeId {
  return (localStorage.getItem(STORAGE_KEY) as ThemeId | null) ?? "system";
}

function getServerSnapshot(): ThemeId {
  return "system";
}

export function ThemeSwitcher({
  className = "",
  align = "left",
}: {
  className?: string;
  align?: "left" | "right";
}) {
  const selected = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Keep the app in sync with the OS when "system" is active.
  useEffect(() => {
    if (selected !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [selected]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(id: ThemeId) {
    localStorage.setItem(STORAGE_KEY, id);
    applyTheme(id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === selected) ?? THEMES[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change theme"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
      >
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 rounded-full border border-white/20"
          style={{ background: current.bg }}
        >
          <span
            className="block h-full w-full scale-[0.55] rounded-full"
            style={{ background: current.accent }}
          />
        </span>
        <span className="flex-1 truncate text-left">{current.label}</span>
        <span aria-hidden className="text-white/40">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--surface-solid)] p-1.5 shadow-2xl shadow-black/50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {THEMES.map((t) => {
            const active = t.id === selected;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                  active
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "text-white/80 hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20"
                  style={{ background: t.bg }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: t.accent }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {t.label}
                  </span>
                  <span className="block truncate text-xs text-white/45">
                    {t.hint}
                  </span>
                </span>
                {active && (
                  <span aria-hidden className="text-emerald-300">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
