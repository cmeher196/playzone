import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTournament } from "@/lib/tournaments";
import { listTeams, listTeamsForOwner } from "@/lib/teams";
import { canManageTournament } from "@/lib/tournaments";
import { DashboardShell } from "@/components/DashboardShell";
import { isAdmin } from "@/lib/admin";
import { CreateTeamForm } from "@/components/CreateTeamForm";

export default async function NewTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const existingTeams = canManageTournament(tournament, { id: user.id, isAdmin: isAdmin(user) })
    ? await listTeams()
    : await listTeamsForOwner(user.id);

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <div className="mb-5">
        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-white/50 transition hover:text-white/80"
        >
          ← Back to {tournament.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Create a team</h1>
        <p className="mt-1 text-sm text-white/50">
          You&apos;ll be the team manager. Add players who have joined this
          tournament.
        </p>
      </div>
      <CreateTeamForm tournamentId={id} existingTeams={existingTeams} />
    </DashboardShell>
  );
}
