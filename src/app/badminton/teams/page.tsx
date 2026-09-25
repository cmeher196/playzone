import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listBadmintonTeams, listBadmintonTeamsForOwner } from "@/lib/badminton-teams";
import { listPlayers, type PublicPlayer } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";
import { BadmintonTeamManager } from "@/components/BadmintonTeamManager";

export default async function BadmintonTeamsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";
  const allPlayers = (await listPlayers())
    .filter((p: PublicPlayer) => p.role !== "admin")
    .map((p: PublicPlayer) => ({ id: p.id, name: p.name, gender: p.gender, mobile: p.mobile }));

  const teams = isAdmin ? await listBadmintonTeams() : await listBadmintonTeamsForOwner(user.id);

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin}>
      <div className="mb-6">
        <p className="text-sm text-orange-300">🏸 Badminton</p>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="mt-1 text-sm text-white/50">
          Build a team of one or two players. Organizers can add your team to their tournaments.
        </p>
      </div>
      <BadmintonTeamManager
        allPlayers={allPlayers}
        initialTeams={teams}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />
    </DashboardShell>
  );
}
