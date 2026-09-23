import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { BadmintonTournamentForm } from "@/components/BadmintonTournamentForm";

export default async function NewBadmintonPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create badminton tournament</h1>
          <p className="mt-2 text-white/60">Set up a new league with multiple courts for concurrent matches</p>
        </div>
        <BadmintonTournamentForm />
      </div>
    </DashboardShell>
  );
}
