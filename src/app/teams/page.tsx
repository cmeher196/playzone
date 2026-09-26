import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { listTeamsForUser, isTeamCoOwner } from "@/lib/teams";
import { DashboardShell } from "@/components/DashboardShell";

export default async function TeamsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const teams = await listTeamsForUser(user.id);

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-white/50">
            Teams you own or play in.
          </p>
        </div>
        <Link
          href="/teams/new"
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
        >
          + Create team
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="mb-3 text-4xl">🛡️</div>
          <p className="text-white/70">You&apos;re not part of any team yet.</p>
          <p className="mt-1 text-sm text-white/40">
            Create a team, or ask a team owner to add you as a player.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => {
            const isOwner = team.ownerId === user.id;
            const isCoOwner = !isOwner && isTeamCoOwner(team, user.id);
            const roleLabel = isOwner ? "Owner" : isCoOwner ? "Co-owner" : "Player";
            return (
              <li key={team.id}>
                <Link
                  href={`/teams/${team.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-400/40 hover:bg-white/[0.05]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                    {team.logo?.startsWith("/uploads/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={team.logo}
                        alt={`${team.name} logo`}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      team.logo || "🏏"
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-white group-hover:text-emerald-200">
                        {team.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isOwner || isCoOwner
                            ? "bg-amber-400/15 text-amber-300"
                            : "bg-sky-400/15 text-sky-300"
                        }`}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    <div className="text-xs text-white/50">
                      {team.players.length} players · managed by {team.ownerName}
                    </div>
                  </div>
                  <span className="shrink-0 text-white/30">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
