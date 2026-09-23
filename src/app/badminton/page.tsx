import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listBadmintonTournaments } from "@/lib/badminton-tournaments";
import { DashboardShell } from "@/components/DashboardShell";

export default async function BadmintonPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tournaments = await listBadmintonTournaments();

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-orange-300">🏸 Badminton</p>
            <h1 className="text-3xl font-bold">Tournaments</h1>
            <p className="mt-2 text-sm text-white/70">Create and manage badminton leagues with multiple courts</p>
          </div>
          <Link
            href="/badminton/new"
            className="rounded-xl bg-orange-400 px-6 py-3 text-sm font-semibold text-orange-950 transition hover:bg-orange-300"
          >
            + Create
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-3xl font-bold text-orange-300">{tournaments.length}</p>
            <p className="mt-2 text-sm text-white/60">Tournament{tournaments.length === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-3xl font-bold text-orange-300">
              {tournaments.reduce((sum, t) => sum + t.courts.length, 0)}
            </p>
            <p className="mt-2 text-sm text-white/60">Total courts</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-3xl font-bold text-orange-300">
              {tournaments.reduce((sum, t) => sum + t.matches.length, 0)}
            </p>
            <p className="mt-2 text-sm text-white/60">Total matches</p>
          </div>
        </div>

        {/* Tournaments List */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Your Leagues</h2>
          {tournaments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-white/60">No tournaments yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/badminton/${tournament.id}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-orange-300/40 hover:bg-orange-300/[0.04]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold group-hover:text-orange-300">{tournament.name}</h3>
                      {tournament.description && (
                        <p className="mt-1 text-sm text-white/60 line-clamp-2">{tournament.description}</p>
                      )}
                    </div>
                    <span className="ml-2 text-2xl">🏸</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="space-y-1">
                      <p className="text-xs text-white/50">
                        {tournament.courts.length} court{tournament.courts.length === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-white/50">
                        {tournament.matches.length} match{tournament.matches.length === 1 ? "" : "es"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      tournament.status === "live"
                        ? "bg-rose-400/20 text-rose-300"
                        : tournament.status === "completed"
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-white/10 text-white/60"
                    }`}>
                      {tournament.status}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-orange-300 group-hover:text-orange-200">View details →</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
