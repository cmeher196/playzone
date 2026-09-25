import Link from "next/link";
import { RegistrationForm } from "@/components/RegistrationForm";
import { appConfig } from "@/lib/config";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = next?.startsWith("/join/") ? next : "/profile";
  const { appName, leagueName, leagueFullName } = appConfig;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--page-bg)] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--page-glow),transparent_55%)]" />
      </div>
      <div className="absolute right-4 top-6 z-20">
        <ThemeSwitcher align="right" className="w-40" />
      </div>
      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm backdrop-blur">
            <span aria-hidden>🏏</span>
            <span className="font-semibold tracking-tight">{appName}</span>
            <span className="text-white/25">·</span>
            <span className="text-emerald-300">{leagueName}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Player Registration</h1>
          <p className="mx-auto mt-2 max-w-md text-white/60">
            Join <span className="text-white">{leagueFullName}</span>. Create your player profile, then find tournaments to play.
          </p>
        </header>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-7">
          <RegistrationForm redirectTo={redirectTo} />
        </div>
        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            Log in here
          </Link>
        </p>
      </div>
    </main>
  );
}