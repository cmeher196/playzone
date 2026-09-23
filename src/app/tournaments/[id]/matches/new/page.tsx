import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getTournament, canManageTournament } from "@/lib/tournaments";
import { listTeamsForTournament } from "@/lib/teams";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateMatchForm } from "@/components/CreateMatchForm";

export default async function NewMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  if (!canManageTournament(tournament, { id: user.id, isAdmin: isAdmin(user) })) {
    redirect(`/tournaments/${id}`);
  }

  const teams = await listTeamsForTournament(id);

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <div className="mb-5">
        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-white/50 transition hover:text-white/80"
        >
          ← Back to {tournament.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Create a match</h1>
      </div>

      {teams.length < 2 ? (
        <p className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
          You need at least two teams with players before creating a match.{" "}
          <Link
            href={`/tournaments/${id}/teams/new`}
            className="text-emerald-300 hover:text-emerald-200"
          >
            Create a team
          </Link>
        </p>
      ) : (
        <CreateMatchForm
          tournamentId={id}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        />
      )}
    </DashboardShell>
  );
}
