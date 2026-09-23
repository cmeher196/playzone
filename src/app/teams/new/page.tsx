import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateTeamForm } from "@/components/CreateTeamForm";

export default async function NewStandaloneTeamPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <Link href="/tournaments" className="text-sm text-white/50 transition hover:text-white/80">
        ← Back to tournaments
      </Link>
      <div className="mt-2 mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Create a team</h1>
        <p className="mt-1 text-sm text-white/50">Build a squad now and add it to tournaments later.</p>
      </div>
      <CreateTeamForm />
    </DashboardShell>
  );
}
