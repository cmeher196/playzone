import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ProfileEditor } from "@/components/ProfileEditor";
import { DashboardShell } from "@/components/DashboardShell";
import { isAdmin } from "@/lib/admin";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <h1 className="mb-5 text-2xl font-bold tracking-tight">My Profile</h1>
      <ProfileEditor user={user} />
    </DashboardShell>
  );
}
