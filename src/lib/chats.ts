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

export interface ChatPreview extends ChatConversation {
  lastMessage?: ChatMessage;
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

export async function listChatsForUser(userId: string): Promise<ChatPreview[]> {
  const [conversations, messages] = await Promise.all([
    readConversations(),
    readMessages(),
  ]);
  return conversations
    .filter((conversation) => conversation.memberIds.includes(userId))
    .map((conversation) => ({
      ...conversation,
      lastMessage: messages
        .filter((message) => message.conversationId === conversation.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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