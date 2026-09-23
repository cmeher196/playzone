import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

function inviteDestination(value: string | undefined): string {
  return value?.startsWith("/join/") ? value : "/tournaments";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = inviteDestination(next);
  if (await getSessionUser()) redirect(redirectTo);
  const { appName, leagueName } = appConfig;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--page-bg)] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--page-glow),transparent_55%)]" />
      </div>

      <div className="absolute right-4 top-6 z-20">
        <ThemeSwitcher align="right" className="w-40" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm backdrop-blur">
            <span className="text-lg" aria-hidden>
              🏏
            </span>
            <span className="font-semibold tracking-tight">{appName}</span>
            <span className="text-white/25">·</span>
            <span className="text-emerald-300">{leagueName}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mx-auto mt-2 max-w-sm text-white/60">
            Sign in to manage your profile and photos.
          </p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-7">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-sm text-white/50">
          New player?{" "}
          <Link
            href={redirectTo === "/tournaments" ? "/" : `/?next=${encodeURIComponent(redirectTo)}`}
            className="font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            Register here
          </Link>
        </p>
      </div>
    </main>
  );
}
