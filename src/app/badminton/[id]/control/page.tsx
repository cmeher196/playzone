import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBadmintonTournament, canManageBadmintonTournament } from "@/lib/badminton-tournaments";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";
import { BadmintonControlRoom } from "@/components/BadmintonControlRoom";

export default async function BadmintonControlPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tournament = await getBadmintonTournament(id);
  if (!tournament) notFound();

  const canManage = canManageBadmintonTournament(tournament, {
    id: user.id,
    isAdmin: user.role === "admin",
  });
  if (!canManage) redirect(`/badminton/${id}`);

  const players = await listPlayers();
  const playerNames: Record<string, string> = {};
  for (const p of players) playerNames[p.id] = p.name;

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <BadmintonControlRoom initialTournament={tournament} playerNames={playerNames} />
    </DashboardShell>
  );
}
