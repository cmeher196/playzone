"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ChatMessage, ChatPreview } from "@/lib/chats";

interface PlayerOption {
  id: string;
  name: string;
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-5 w-5">
      <path
        fillRule="evenodd"
        d="M12.79 4.23a.75.75 0 0 1 0 1.06L8.06 10l4.73 4.71a.75.75 0 1 1-1.06 1.06l-5.25-5.24a.75.75 0 0 1 0-1.06l5.25-5.24a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ChatsInbox({
  currentUserId,
  initialChats,
  players,
}: {
  currentUserId: string;
  initialChats: ChatPreview[];
  players: PlayerOption[];
}) {
  const [chats, setChats] = useState(initialChats);
  const [selectedId, setSelectedId] = useState(initialChats[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [showNew, setShowNew] = useState(initialChats.length === 0);
  const [members, setMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phones show one pane at a time (master–detail); desktop shows both.
  const [mobilePane, setMobilePane] = useState<"list" | "detail">(
    initialChats.length === 0 ? "detail" : "list",
  );

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const refreshMessages = async () => {
      try {
        const response = await fetch(`/api/chats/${selectedId}/messages`);
        if (!response.ok) return;
        const data = (await response.json()) as { messages: ChatMessage[] };
        setMessages(data.messages);
      } catch {
        // Keep the last received history visible until polling recovers.
      }
    };
    void refreshMessages();
    const timer = window.setInterval(() => void refreshMessages(), 6000);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  // Persist a read marker (and refresh the nav badge) whenever a conversation
  // is open — on open and each time new messages arrive while it's on screen.
  // The open chat already renders as read via the `selectedId` guard below, so
  // no local state update is needed here.
  const markRead = useCallback((chatId: string) => {
    void fetch(`/api/chats/${chatId}/read`, { method: "POST" })
      .then(() => window.dispatchEvent(new Event("chats:read")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    markRead(selectedId);
  }, [selectedId, messages.length, markRead]);

  // Keep the per-conversation unread badges in the list fresh; the open chat
  // always shows as read.
  useEffect(() => {
    const refreshUnread = async () => {
      try {
        const response = await fetch("/api/chats/unread", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { byConversation?: Record<string, number> };
        const counts = data.byConversation ?? {};
        setChats((current) =>
          current.map((chat) => ({
            ...chat,
            unreadCount: chat.id === selectedId ? 0 : counts[chat.id] ?? 0,
          })),
        );
      } catch {
        // Ignore transient errors; the next tick retries.
      }
    };
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 15000);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  function toggleMember(playerId: string) {
    setMembers((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  async function createConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (members.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: members, name: groupName }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; chat?: ChatPreview };
      if (!response.ok || !data.chat) {
        setError(data.error ?? "Couldn't create chat.");
        return;
      }
      setChats((current) => [data.chat!, ...current.filter((chat) => chat.id !== data.chat!.id)]);
      setSelectedId(data.chat.id);
      setMessages([]);
      setMembers([]);
      setGroupName("");
      setShowNew(false);
      setMobilePane("detail");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageText = text.trim();
    if (!selectedId || !messageText || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/chats/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: ChatMessage };
      if (!response.ok || !data.message) {
        setError(data.error ?? "Couldn't send message.");
        return;
      }
      setMessages((current) => [...current, data.message!]);
      setChats((current) => current.map((chat) => chat.id === selectedId ? { ...chat, updatedAt: data.message!.createdAt, lastMessage: data.message } : chat).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setText("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const selectedChat = chats.find((chat) => chat.id === selectedId);

  return (
    <div className="flex h-[75dvh] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] md:grid md:h-[640px] md:min-h-0 md:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className={`${mobilePane === "detail" ? "hidden" : "flex"} min-h-0 flex-1 flex-col md:flex md:border-r md:border-white/10`}>
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold text-white">Chats</h1>
          <button type="button" onClick={() => { const next = !showNew; setShowNew(next); setMobilePane(next ? "detail" : "list"); }} className="rounded-lg bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-300">New</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {chats.map((chat) => {
            const unread = chat.id === selectedId ? 0 : chat.unreadCount ?? 0;
            const active = selectedId === chat.id;
            return (
              <button key={chat.id} type="button" onClick={() => { setSelectedId(chat.id); setShowNew(false); setError(null); setMobilePane("detail"); }} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? "bg-white/[0.04] md:bg-emerald-400/15" : "hover:bg-white/5"}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-semibold text-emerald-200">{initialsOf(chat.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-white ${unread > 0 ? "font-semibold" : "font-medium"}`}>{chat.isGroup ? "Group: " : ""}{chat.name}</span>
                    {unread > 0 && (
                      <span className="inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </span>
                  <span className={`mt-1 block truncate text-xs ${unread > 0 ? "text-white/70" : "text-white/45"}`}>{chat.lastMessage ? `${chat.lastMessage.senderName}: ${chat.lastMessage.text}` : "No messages yet"}</span>
                </span>
              </button>
            );
          })}
          {chats.length === 0 && !showNew && <p className="px-3 py-6 text-center text-sm text-white/45">No chats yet.</p>}
        </div>
      </aside>

      <section className={`${mobilePane === "list" ? "hidden" : "flex"} min-h-0 min-w-0 flex-1 flex-col md:flex`}>
        {showNew ? (
          <form onSubmit={createConversation} className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setShowNew(false); setMobilePane("list"); }} aria-label="Back to chats" className="-ml-1 rounded-lg p-2 text-white/70 hover:bg-white/10 md:hidden"><BackArrowIcon /></button>
              <h2 className="text-lg font-semibold text-white">Start a chat</h2>
            </div>
            <p className="mt-1 text-sm text-white/50">Choose one player for a direct chat, or several players for a group.</p>
            {members.length > 1 && <input value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={60} placeholder="Group name (optional)" className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-400/60" />}
            <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {players.filter((player) => player.id !== currentUserId).map((player) => (
                <label key={player.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/5">
                  <input type="checkbox" checked={members.includes(player.id)} onChange={() => toggleMember(player.id)} className="h-4 w-4 accent-emerald-400" />
                  {player.name}
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2"><button type="submit" disabled={members.length === 0 || busy} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50">{busy ? "Creating..." : "Create chat"}</button><button type="button" onClick={() => { setShowNew(false); setMobilePane("list"); }} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5">Cancel</button></div>
          </form>
        ) : selectedChat ? (
          <>
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3 md:px-5 md:py-4">
              <button type="button" onClick={() => setMobilePane("list")} aria-label="Back to chats" className="-ml-1 rounded-lg p-2 text-white/70 hover:bg-white/10 md:hidden"><BackArrowIcon /></button>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-semibold text-emerald-200">{initialsOf(selectedChat.name)}</span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-white">{selectedChat.isGroup ? "Group: " : ""}{selectedChat.name}</h2>
                  <p className="text-xs text-white/45">{selectedChat.memberIds.length} member{selectedChat.memberIds.length === 1 ? "" : "s"}</p>
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
              {messages.length === 0 ? <p className="pt-12 text-center text-sm text-white/45">No messages yet. Say hello.</p> : messages.map((message) => { const mine = message.senderId === currentUserId; return (<div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? "self-end rounded-br-md bg-emerald-400/20" : "self-start rounded-bl-md bg-white/[0.07]"}`}><div className="text-xs font-semibold text-emerald-200">{mine ? "You" : message.senderName}</div><p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/85">{message.text}</p><time className="mt-1 block text-right text-[11px] text-white/35">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>); })}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3 md:p-4"><label htmlFor="chat-message" className="sr-only">Message</label><input id="chat-message" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-400/60" /><button type="submit" disabled={!text.trim() || busy} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50">Send</button></form>
          </>
        ) : <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-white/45">Select a chat to start a conversation.</div>}
        {error && <p className="px-5 pb-3 text-sm text-rose-300">{error}</p>}
      </section>
    </div>
  );
}