import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listBadmintonTournaments } from "@/lib/badminton-tournaments";
import { DashboardShell } from "@/components/DashboardShell";
import Link from "next/link";

export default async function BadmintonTournamentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tournaments = await listBadmintonTournaments();

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-orange-300">🏸 Badminton circuit</p>
            <h1 className="text-2xl font-bold">Tournaments</h1>
          </div>
          <Link
            href="/badminton/new"
            className="rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-orange-950 transition hover:bg-orange-300"
          >
            + Create
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
            No badminton tournaments yet.
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
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold group-hover:text-orange-300">{tournament.name}</h2>
                    {tournament.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-white/60">{tournament.description}</p>
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
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      tournament.status === "live"
                        ? "bg-rose-400/20 text-rose-300"
                        : tournament.status === "completed"
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-white/10 text-white/60"
                    }`}
                  >
                    {tournament.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}