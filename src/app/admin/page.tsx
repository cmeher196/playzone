import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminUser, seedAdmin } from "@/lib/admin";
import { listPlayers } from "@/lib/registrations";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await seedAdmin();

  const admin = await getAdminUser();
  if (!admin) {
    const user = await getSessionUser();
    redirect(user ? "/profile" : "/login");
  }

  const accounts = await listPlayers();

  return (
    <DashboardShell userName={admin.name} isAdmin>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-white/50">
          View and manage every registered account.
        </p>
      </div>
      <AdminDashboard accounts={accounts} currentAdminId={admin.id} />
    </DashboardShell>
  );
}
