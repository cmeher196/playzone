import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { isAdmin } from "@/lib/admin";
import { CreateTournamentForm } from "@/components/CreateTournamentForm";

export default async function NewTournamentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <div className="mb-5">
        <Link
          href="/tournaments"
          className="text-sm text-white/50 transition hover:text-white/80"
        >
          ← Back to tournaments
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Create a tournament
        </h1>
      </div>
      <CreateTournamentForm />
    </DashboardShell>
  );
}
