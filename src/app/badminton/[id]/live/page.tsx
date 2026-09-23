import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBadmintonTournament } from "@/lib/badminton-tournaments";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";
import { BadmintonControlRoom } from "@/components/BadmintonControlRoom";

// Public live scoreboard — visible to any logged-in user (read-only).
export default async function BadmintonLivePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tournament = await getBadmintonTournament(id);
  if (!tournament) notFound();

  const players = await listPlayers();
  const playerNames: Record<string, string> = {};
  for (const p of players) playerNames[p.id] = p.name;

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <BadmintonControlRoom
        initialTournament={tournament}
        playerNames={playerNames}
        heading="📺 Live Scores"
        tagline="Follow every court in real time"
      />
    </DashboardShell>
  );
}
