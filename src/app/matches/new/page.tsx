import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { listTournaments } from "@/lib/tournaments";
import { listTeamsForTournament } from "@/lib/teams";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateStandaloneMatchForm } from "@/components/CreateStandaloneMatchForm";

export default async function NewMatchPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "guest") redirect("/register");

  const admin = isAdmin(user);
  const tournaments = await listTournaments();
  const tournamentOptions = await Promise.all(
    tournaments.map(async (tournament) => ({
      tournament,
      teamCount: (await listTeamsForTournament(tournament.id)).length,
    })),
  );

  return (
    <DashboardShell userName={user.name} isAdmin={admin}>
      <div className="mb-6">
        <Link href="/matches" className="text-sm text-white/50 transition hover:text-white/80">
          ← Back to matches
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Create a match</h1>
        <p className="mt-1 text-sm text-white/50">
          Choose a tournament to set up teams, toss, venue and match time.
        </p>
      </div>

      {tournamentOptions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-white/70">You do not manage any tournaments yet.</p>
          <Link
            href="/tournaments/new"
            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
          >
            Create a tournament
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tournamentOptions.map(({ tournament, teamCount }) => (
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.id}/matches/new`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-400/40 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-white">{tournament.name}</h2>
                <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">
                  {teamCount} teams
                </span>
              </div>
              <p className="mt-2 text-sm text-white/50">
                {teamCount >= 2
                  ? "Open match setup"
                  : "Add at least two teams first"}
                <span className="ml-2 text-emerald-300">→</span>
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-white/10 pt-8">
        <h2 className="text-xl font-semibold">Create without a tournament</h2>
        <p className="mt-1 mb-4 text-sm text-white/50">
          Set up a one-off match with your own teams and players.
        </p>
        <CreateStandaloneMatchForm />
      </div>
    </DashboardShell>
  );
}