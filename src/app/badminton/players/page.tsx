import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listPlayers } from "@/lib/registrations";
import { listBadmintonTournaments } from "@/lib/badminton-tournaments";
import { DashboardShell } from "@/components/DashboardShell";

export default async function BadmintonPlayersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const players = (await listPlayers()).filter((player) => player.role !== "admin");
  const tournaments = await listBadmintonTournaments();
  const activeIds = new Set(tournaments.flatMap((tournament) => tournament.participantIds));
  return <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
    <div className="mb-6"><p className="text-sm text-orange-300">🏸 Badminton community</p><h1 className="text-2xl font-bold">Players</h1><p className="mt-1 text-sm text-white/50">Shared player profiles, with badminton participation kept separate from cricket stats.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{players.map((player) => <div key={player.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-300/15 text-lg">🏸</div><div className="min-w-0"><p className="truncate font-semibold">{player.name}</p><p className="text-xs text-white/40">{activeIds.has(player.id) ? "Registered in badminton" : "Available to register"}</p></div></div></div>)}</div>
  </DashboardShell>;
}