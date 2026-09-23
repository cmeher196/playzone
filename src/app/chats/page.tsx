import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { ChatsInbox } from "@/components/ChatsInbox";
import { getSessionUser } from "@/lib/auth";
import { listChatsForUser } from "@/lib/chats";
import { listPlayers } from "@/lib/registrations";

export default async function ChatsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [chats, players] = await Promise.all([listChatsForUser(user.id), listPlayers()]);
  return (
    <DashboardShell userName={user.name} isAdmin={user.role === "admin"}>
      <ChatsInbox currentUserId={user.id} initialChats={chats} players={players.map((player) => ({ id: player.id, name: player.name }))} />
    </DashboardShell>
  );
}