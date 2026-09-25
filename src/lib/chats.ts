import crypto from "node:crypto";
import { readStoredArray, writeStoredArray } from "./mongo";

export interface ChatConversation {
  id: string;
  name: string;
  memberIds: string[];
  isGroup: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

// Tracks how far a member has read into a conversation. The composite id keeps
// one record per (user, conversation) pair for efficient upserts.
export interface ChatRead {
  id: string; // `${userId}::${conversationId}`
  userId: string;
  conversationId: string;
  lastReadAt: string;
}

export interface ChatPreview extends ChatConversation {
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

async function readConversations(): Promise<ChatConversation[]> {
  return readStoredArray<ChatConversation>("chats", "chats.json");
}

async function writeConversations(items: ChatConversation[]): Promise<void> {
  await writeStoredArray("chats", "chats.json", items);
}

async function readMessages(): Promise<ChatMessage[]> {
  return readStoredArray<ChatMessage>("chatMessages", "chat-messages.json");
}

async function writeMessages(items: ChatMessage[]): Promise<void> {
  await writeStoredArray("chatMessages", "chat-messages.json", items);
}

async function readReads(): Promise<ChatRead[]> {
  return readStoredArray<ChatRead>("chatReads", "chat-reads.json");
}

async function writeReads(items: ChatRead[]): Promise<void> {
  await writeStoredArray("chatReads", "chat-reads.json", items);
}

/** Counts messages from other members newer than the user's last-read marker. */
function unreadIn(
  conversationId: string,
  userId: string,
  messages: ChatMessage[],
  lastReadAt: string,
): number {
  return messages.filter(
    (message) =>
      message.conversationId === conversationId &&
      message.senderId !== userId &&
      message.createdAt > lastReadAt,
  ).length;
}

export async function listChatsForUser(userId: string): Promise<ChatPreview[]> {
  const [conversations, messages, reads] = await Promise.all([
    readConversations(),
    readMessages(),
    readReads(),
  ]);
  const lastReadOf = new Map(
    reads.filter((read) => read.userId === userId).map((read) => [read.conversationId, read.lastReadAt]),
  );
  return conversations
    .filter((conversation) => conversation.memberIds.includes(userId))
    .map((conversation) => ({
      ...conversation,
      lastMessage: messages
        .filter((message) => message.conversationId === conversation.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
      unreadCount: unreadIn(conversation.id, userId, messages, lastReadOf.get(conversation.id) ?? ""),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Total unread messages for the user, plus a per-conversation breakdown. */
export async function getUnreadCounts(
  userId: string,
): Promise<{ total: number; byConversation: Record<string, number> }> {
  const [conversations, messages, reads] = await Promise.all([
    readConversations(),
    readMessages(),
    readReads(),
  ]);
  const lastReadOf = new Map(
    reads.filter((read) => read.userId === userId).map((read) => [read.conversationId, read.lastReadAt]),
  );
  const byConversation: Record<string, number> = {};
  let total = 0;
  for (const conversation of conversations) {
    if (!conversation.memberIds.includes(userId)) continue;
    const count = unreadIn(conversation.id, userId, messages, lastReadOf.get(conversation.id) ?? "");
    if (count > 0) {
      byConversation[conversation.id] = count;
      total += count;
    }
  }
  return { total, byConversation };
}

/** Marks a conversation read for a user up to now. No-op if the user can't see it. */
export async function markChatRead(userId: string, conversationId: string): Promise<void> {
  const reads = await readReads();
  const id = `${userId}::${conversationId}`;
  const now = new Date().toISOString();
  const index = reads.findIndex((read) => read.id === id);
  if (index === -1) {
    reads.push({ id, userId, conversationId, lastReadAt: now });
  } else {
    reads[index].lastReadAt = now;
  }
  await writeReads(reads);
}

export async function getChat(id: string): Promise<ChatConversation | undefined> {
  return (await readConversations()).find((conversation) => conversation.id === id);
}

export async function createChat(input: {
  name: string;
  memberIds: string[];
  createdBy: string;
}): Promise<ChatConversation> {
  const conversations = await readConversations();
  const memberIds = [...new Set([...input.memberIds, input.createdBy])];
  const isGroup = memberIds.length > 2;
  const existing = !isGroup
    ? conversations.find(
        (conversation) =>
          !conversation.isGroup &&
          conversation.memberIds.length === 2 &&
          conversation.memberIds.every((memberId) => memberIds.includes(memberId)),
      )
    : undefined;
  if (existing) return existing;

  const now = new Date().toISOString();
  const conversation: ChatConversation = {
    id: `CH-${crypto.randomUUID()}`,
    name: input.name,
    memberIds,
    isGroup,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  conversations.push(conversation);
  await writeConversations(conversations);
  return conversation;
}

export async function listChatMessages(conversationId: string): Promise<ChatMessage[]> {
  return (await readMessages())
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createChatMessage(input: {
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
}): Promise<ChatMessage> {
  const [conversations, messages] = await Promise.all([
    readConversations(),
    readMessages(),
  ]);
  const index = conversations.findIndex(
    (conversation) => conversation.id === input.conversationId,
  );
  if (index === -1) throw new Error("Chat not found.");

  const message: ChatMessage = {
    ...input,
    id: `CM-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  conversations[index].updatedAt = message.createdAt;
  await Promise.all([writeMessages(messages), writeConversations(conversations)]);
  return message;
}