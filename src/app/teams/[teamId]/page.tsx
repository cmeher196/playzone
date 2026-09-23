import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament } from "@/lib/tournaments";
import { getTeam, canManageTeamForUser } from "@/lib/teams";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";
import { ManageTeam } from "@/components/ManageTeam";
import { BackButton } from "@/components/BackButton";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) notFound();

  const tournament = await getTournament(team.tournamentId);
  const canManage = await canManageTeamForUser(team, {
    id: user.id,
    isAdmin: isAdmin(user),
  });

  const eligible = (await listPlayers())
    .filter((player) => player.role !== "admin" && !team.players.some((member) => member.playerId === player.id))
    .map((player) => ({ playerId: player.id, name: player.name, mobile: player.mobile }));

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      {team.tournamentId && <BackButton fallbackHref={`/tournaments/${team.tournamentId}`}>
        ← {tournament?.name ?? "Tournament"}
      </BackButton>}

      <div className="mt-2 mb-5 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl">
          {team.logo?.startsWith("/uploads/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo} alt={`${team.name} logo`} className="h-full w-full object-cover" />
          ) : (
            team.logo || "🏏"
          )}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          <div className="mt-1 text-sm text-white/50">
            Managed by {team.ownerName} · {team.players.length} players
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 text-base font-semibold text-white">Squad</h2>
        {team.players.length === 0 ? (
          <p className="text-sm text-white/40">
            No players yet.
            {canManage && " Add players from the manage panel below."}
          </p>
        ) : (
          <ul className="space-y-2">
            {team.players.map((p) => (
              <li
                key={p.playerId}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <Link
                  href={`/players/${p.playerId}`}
                  className="text-white transition hover:text-emerald-300"
                >
                  {p.playerNumber !== undefined ? `#${p.playerNumber} ` : ""}{p.name}
                </Link>
                <span className="flex gap-1">
                  {team.captainId === p.playerId && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      C
                    </span>
                  )}
                  {team.viceCaptainId === p.playerId && (
                    <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                      VC
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="mt-6">
          <ManageTeam team={team} eligible={eligible} />
        </div>
      )}
    </DashboardShell>
  );
}
